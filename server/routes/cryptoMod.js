// routes/cryptoMod.js
import express from "express";
import logger from "../logger.js";
import logError from "../utils/logError.js";

// utils
import { getCooldownStatus } from "../utils/crypto/isOnCooldown.js";

export default function cryptoRoutes(db) {
  const router = express.Router();

  // --- /api/market/tokens ---
  router.get("/market/tokens", async (req, res) => {
    try {
      const result = await db.query(
        `SELECT id, name, symbol, total_supply, price_per_unit, description, available_supply, is_memecoin, crashed FROM crypto_tokens ORDER BY id ASC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error(`❌ Failed to fetch market tokens: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/market/buy ---
  router.post("/market/buy", async (req, res) => {
    const userId = req.cookies.user_session;
    const { tokenId, amount } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { onCooldown, secondsRemaining } = await getCooldownStatus(
      db,
      userId,
      tokenId
    );
    if (onCooldown) {
      return res.status(429).json({
        error: "Cooldown active",
        cooldown: secondsRemaining,
      });
    }

    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount provided" });
    }

    try {
      const userResult = await db.query(
        `SELECT balance FROM user_funds WHERE discord_id = $1`,
        [userId]
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: "User funds not found" });
      }

      const balance = parseFloat(userResult.rows[0].balance);

      const tokenResult = await db.query(
        `SELECT id, price_per_unit, available_supply, is_memecoin FROM crypto_tokens WHERE id = $1`,
        [tokenId]
      );

      if (tokenResult.rowCount === 0) {
        return res.status(404).json({ error: "Token not found" });
      }

      const token = tokenResult.rows[0];
      const price = parseFloat(token.price_per_unit);
      const availableSupply = parseFloat(token.available_supply);
      const isMemecoin = token.is_memecoin === true;
      const taxRate = isMemecoin ? 0.05 : 0;
      const totalCost = price * floatAmount;
      const taxedCost = totalCost * (1 + taxRate);

      if (taxedCost > balance) {
        return res
          .status(400)
          .json({ error: "Insufficient funds (incl. tax)" });
      }

      if (floatAmount > availableSupply) {
        return res.status(400).json({ error: "Not enough tokens available" });
      }

      await db.query("BEGIN");

      await db.query(
        `UPDATE user_funds SET balance = balance - $1 WHERE discord_id = $2`,
        [taxedCost, userId]
      );

      if (isMemecoin) {
        const taxAmount = taxedCost - totalCost;
        await db.query(
          `UPDATE memecoin_tax_tracker SET total_collected = total_collected + $1 WHERE id = 1`,
          [taxAmount]
        );
      }

      await db.query(
        `UPDATE crypto_tokens SET available_supply = available_supply - $1 WHERE id = $2`,
        [floatAmount, tokenId]
      );

      await db.query(
        `INSERT INTO user_tokens (discord_id, token_id, amount, price_at_purchase)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (discord_id, token_id)
       DO UPDATE SET amount = user_tokens.amount + $3, price_at_purchase = $4`,
        [userId, tokenId, floatAmount, price]
      );

      await db.query(
        `INSERT INTO token_transactions (discord_id, token_id, amount, price_at_transaction, type)
   VALUES ($1, $2, $3, $4, 'buy')`,
        [userId, tokenId, floatAmount, price]
      );

      await db.query("COMMIT");

      res.json({ success: true, message: "Token purchased successfully" });
    } catch (error) {
      await db.query("ROLLBACK");
      console.error("❌ Buy token failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/market/user-tokens ---
  router.get("/market/user-tokens", async (req, res) => {
    const userId = req.cookies.user_session;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const result = await db.query(
        `
      SELECT 
        ut.token_id,
        ut.amount,
        ut.price_at_purchase,
        ct.symbol,
        ct.name
      FROM user_tokens ut
      JOIN crypto_tokens ct ON ut.token_id = ct.id
      WHERE ut.discord_id = $1
      `,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("❌ Failed to fetch user tokens:", logError(error));
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/market/sell", async (req, res) => {
    const userId = req.cookies.user_session;
    const { tokenId, amount } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { onCooldown, secondsRemaining } = await getCooldownStatus(
      db,
      userId
    );
    if (onCooldown) {
      return res.status(429).json({
        error: "Cooldown active",
        cooldown: secondsRemaining,
      });
    }

    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount provided" });
    }

    try {
      const userTokenResult = await db.query(
        `SELECT amount FROM user_tokens WHERE discord_id = $1 AND token_id = $2`,
        [userId, tokenId]
      );

      if (userTokenResult.rowCount === 0) {
        return res.status(404).json({ error: "You do not own this token" });
      }

      const ownedAmount = parseFloat(userTokenResult.rows[0].amount);
      if (floatAmount > ownedAmount) {
        return res.status(400).json({ error: "Not enough tokens to sell" });
      }

      const tokenResult = await db.query(
        `SELECT price_per_unit, is_memecoin FROM crypto_tokens WHERE id = $1`,
        [tokenId]
      );

      if (tokenResult.rowCount === 0) {
        return res.status(404).json({ error: "Token not found" });
      }

      const token = tokenResult.rows[0];
      const price = parseFloat(token.price_per_unit);
      const isMemecoin = token.is_memecoin === true;
      const taxRate = isMemecoin ? 0.05 : 0;
      const grossGain = price * floatAmount;
      const netGain = grossGain * (1 - taxRate);
      const taxAmount = grossGain - netGain;

      await db.query("BEGIN");

      await db.query(
        `UPDATE user_funds SET balance = balance + $1 WHERE discord_id = $2`,
        [netGain, userId]
      );

      if (isMemecoin) {
        await db.query(
          `UPDATE memecoin_tax_tracker SET total_collected = total_collected + $1 WHERE id = 1`,
          [taxAmount]
        );
      }

      await db.query(
        `UPDATE crypto_tokens SET available_supply = available_supply + $1 WHERE id = $2`,
        [floatAmount, tokenId]
      );

      await db.query(
        `UPDATE user_tokens SET amount = amount - $1 WHERE discord_id = $2 AND token_id = $3`,
        [floatAmount, userId, tokenId]
      );

      await db.query(
        `DELETE FROM user_tokens WHERE amount <= 0 AND discord_id = $1 AND token_id = $2`,
        [userId, tokenId]
      );

      await db.query(
        `INSERT INTO token_transactions (discord_id, token_id, amount, price_at_transaction, type)
       VALUES ($1, $2, $3, $4, 'sell')`,
        [userId, tokenId, floatAmount, price]
      );

      await db.query("COMMIT");

      res.json({ success: true, message: "Token sold successfully" });
    } catch (error) {
      await db.query("ROLLBACK");
      console.error("❌ Sell token failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/market/transaction-history ---
  router.get("/market/transaction-history", async (req, res) => {
    const userId = req.cookies.user_session;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const result = await db.query(
        `
      SELECT 
        t.id,
        t.token_id,
        ct.name AS token_name,
        ct.symbol AS token_symbol,
        t.amount,
        t.price_at_transaction,
        t.type,
        t.timestamp
      FROM token_transactions t
      JOIN crypto_tokens ct ON t.token_id = ct.id
      WHERE t.discord_id = $1
      ORDER BY t.timestamp DESC
      LIMIT 20
      `,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("❌ Failed to fetch transaction history:", logError(error));
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/market/token-history/:tokenId ---
  router.get("/market/token-history/:tokenId", async (req, res) => {
    const tokenId = req.params.tokenId;
    const range = req.query.range || "all";

    let tableName = "token_price_history_weekly";
    let intervalCondition = "TRUE";
    let groupExpr = "date_trunc('day', recorded_at)";

    switch (range) {
      case "1h":
        tableName = "token_price_history_minutes";
        intervalCondition = "recorded_at >= NOW() - INTERVAL '1 hour'";
        groupExpr = "date_trunc('minute', recorded_at)";
        break;

      case "24h":
        tableName = "token_price_history_hourly";
        intervalCondition = "recorded_at >= NOW() - INTERVAL '24 hours'";
        groupExpr = "date_trunc('hour', recorded_at)";
        break;

      case "7d":
        tableName = "token_price_history_daily";
        intervalCondition = "recorded_at >= NOW() - INTERVAL '7 days'";
        groupExpr = `
        date_trunc('hour', recorded_at) - 
        INTERVAL '1 hour' * (EXTRACT(hour FROM recorded_at)::int % 6)
      `;
        break;

      case "30d":
        tableName = "token_price_history_daily";
        intervalCondition = "recorded_at >= NOW() - INTERVAL '30 days'";
        groupExpr = "date_trunc('day', recorded_at)";
        break;

      case "all":
      default:
        tableName = "token_price_history_weekly";
        intervalCondition = "TRUE";
        groupExpr = "date_trunc('day', recorded_at)";
        break;
    }

    try {
      const result = await db.query(
        `
      SELECT 
        ${groupExpr} AS recorded_at,
        AVG(price) AS price
      FROM ${tableName}
      WHERE token_id = $1 AND ${intervalCondition}
      GROUP BY recorded_at
      ORDER BY recorded_at ASC
      `,
        [tokenId]
      );

      res.json(result.rows);
    } catch (err) {
      console.error("❌ Failed to fetch price history:", err);
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });

  // --- /api/market/portfolio-history ---
  router.get("/market/portfolio-history", async (req, res) => {
    const userId = req.cookies.user_session;
    const range = req.query.range || "30d";

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    let intervalCondition = "";
    switch (range) {
      case "7d":
        intervalCondition = "AND recorded_at >= NOW() - INTERVAL '7 DAYS'";
        break;
      case "30d":
        intervalCondition = "AND recorded_at >= NOW() - INTERVAL '30 DAYS'";
        break;
      case "all":
      default:
        intervalCondition = "";
        break;
    }

    try {
      const result = await db.query(
        `
      SELECT total_value, recorded_at
      FROM user_portfolio_history
      WHERE discord_id = $1
      ${intervalCondition}
      ORDER BY recorded_at ASC
      `,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("❌ Failed to fetch portfolio history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/market/token-distribution/:tokenId ---
  router.get("/market/token-distribution/:tokenId", async (req, res) => {
    const tokenId = req.params.tokenId;

    try {
      const result = await db.query(
        `
      SELECT u.name AS username, ut.amount
      FROM user_tokens ut
      JOIN users u ON ut.discord_id = u.discord_id
      WHERE ut.token_id = $1 AND ut.amount > 0
      ORDER BY ut.amount DESC
      `,
        [tokenId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("❌ Failed to fetch token distribution:", logError(error));
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/market/token-history-by-symbol/:symbol ---
  router.get("/market/token-history-by-symbol/:symbol", async (req, res) => {
    const symbol = req.params.symbol;
    const range = req.query.range || "all";

    // Check for valid symbol
    if (!symbol) {
      return res.status(400).json({ error: "Token symbol is required" });
    }

    let tableName = "token_price_history_weekly";
    let intervalCondition = "TRUE";
    let groupExpr = "date_trunc('day', recorded_at)";

    switch (range) {
      case "1h":
        tableName = "token_price_history_minutes";
        intervalCondition = "recorded_at >= NOW() - INTERVAL '1 hour'";
        groupExpr = "date_trunc('minute', recorded_at)";
        break;
      case "24h":
        tableName = "token_price_history_hourly";
        intervalCondition = "recorded_at >= NOW() - INTERVAL '24 hours'";
        groupExpr = "date_trunc('hour', recorded_at)";
        break;
      case "7d":
        tableName = "token_price_history_daily";
        intervalCondition = "recorded_at >= NOW() - INTERVAL '7 days'";
        groupExpr = `date_trunc('hour', recorded_at) - 
      INTERVAL '1 hour' * (EXTRACT(hour FROM recorded_at)::int % 6)`;
        break;
      case "30d":
        tableName = "token_price_history_daily";
        intervalCondition = "recorded_at >= NOW() - INTERVAL '30 days'";
        groupExpr = "date_trunc('day', recorded_at)";
        break;
      case "all":
      default:
        tableName = "token_price_history_weekly";
        intervalCondition = "TRUE";
        groupExpr = "date_trunc('day', recorded_at)";
        break;
    }

    try {
      const tokenResult = await db.query(
        `SELECT id FROM crypto_tokens WHERE symbol = $1`,
        [symbol]
      );

      if (tokenResult.rowCount === 0) {
        return res.status(404).json({ error: "Token not found" });
      }

      const tokenId = tokenResult.rows[0].id;

      const result = await db.query(
        `
      SELECT 
        ${groupExpr} AS recorded_at,
        AVG(price) AS price
      FROM ${tableName}
      WHERE token_id = $1 AND ${intervalCondition}
      GROUP BY recorded_at
      ORDER BY recorded_at ASC
      `,
        [tokenId]
      );

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ error: "No price history found for this token" });
      }

      res.json(result.rows);
    } catch (err) {
      console.error("❌ Failed to fetch price history:", err);
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });

  return router;
}
