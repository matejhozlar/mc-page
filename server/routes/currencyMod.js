import express from "express";
import logError from "../utils/logError.js";
import logger from "../logger.js";

// middleware
import verifyApiKey from "../middleware/verifyApiKey.js";

// utils
import { logTransactions } from "../utils/logTransactions.js";

export default function currencyRoutes(db) {
  const router = express.Router();

  router.use("/currency", verifyApiKey);

  // --- /api/currency/balance ---
  router.get("/currency/balance", async (req, res) => {
    const { uuid } = req.query;

    if (!uuid) {
      return res.status(400).json({ error: "Missing uuid" });
    }

    try {
      const result = await db.query(
        `SELECT balance FROM user_funds WHERE uuid = $1 LIMIT 1`,
        [uuid]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Player not found" });
      }

      res.json({ balance: result.rows[0].balance });
    } catch (error) {
      logger.error(`❌ /currency/balance error: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/currency/send ---
  router.post("/currency/pay", async (req, res) => {
    const { from_uuid, to_uuid, amount } = req.body;

    if (!from_uuid || !to_uuid || typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const senderRes = await client.query(
        `SELECT balance FROM user_funds WHERE uuid = $1 FOR UPDATE`,
        [from_uuid]
      );

      if (senderRes.rows.length === 0) {
        throw new Error("Sender not found");
      }

      const senderBalance = senderRes.rows[0].balance;

      if (senderBalance < amount) {
        throw new Error("Insufficient funds");
      }

      await client.query(
        `UPDATE user_funds SET balance = balance - $1 WHERE uuid = $2`,
        [amount, from_uuid]
      );

      const recipientRes = await client.query(
        `UPDATE user_funds SET balance = balance + $1 WHERE uuid = $2 RETURNING *`,
        [amount, to_uuid]
      );

      if (recipientRes.rowCount === 0) {
        throw new Error("Recipient not found");
      }

      await client.query("COMMIT");
      await logTransactions(db, {
        uuid: from_uuid,
        action: "pay",
        amount,
        from_uuid,
        to_uuid,
        balance_after: senderBalance - amount,
      });

      res.json({ success: true, new_sender_balance: senderBalance - amount });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`❌ /currency/send error: ${logError(error)}`);
      res.status(400).json({ error: logError(error) });
    } finally {
      client.release();
    }
  });

  // --- /api/currency/deposit ---
  router.post("/currency/deposit", async (req, res) => {
    const { uuid, amount } = req.body;

    if (!uuid || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE user_funds SET balance = balance + $1 WHERE uuid = $2 RETURNING balance`,
        [amount, uuid]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      await client.query("COMMIT");
      await logTransactions(db, {
        uuid,
        action: "deposit",
        amount,
        balance_after: result.rows[0].balance,
      });
      res.json({ success: true, new_balance: result.rows[0].balance });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`❌ /currency/deposit error: ${logError(error)}`);
      res.status(400).json({ error: logError(error) });
    } finally {
      client.release();
    }
  });

  // --- /api/currency/withdraw ---
  router.post("/currency/withdraw", async (req, res) => {
    const { uuid, count, denomination } = req.body;

    if (!uuid || typeof count !== "number" || count <= 0) {
      return res.status(400).json({ error: "Invalid count or uuid" });
    }

    const denom = typeof denomination === "number" ? denomination : 1000;
    const amount = count * denom;

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `SELECT balance FROM user_funds WHERE uuid = $1 FOR UPDATE`,
        [uuid]
      );

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      const balance = result.rows[0].balance;
      if (balance < amount) {
        throw new Error("Insufficient funds");
      }

      const updateRes = await client.query(
        `UPDATE user_funds SET balance = balance - $1 WHERE uuid = $2 RETURNING balance`,
        [amount, uuid]
      );

      await client.query("COMMIT");
      await logTransactions(db, {
        uuid,
        action: "withdraw",
        amount,
        denomination: denom,
        count,
        balance_after: updateRes.rows[0].balance,
      });

      res.json({
        success: true,
        withdrawn: amount,
        new_balance: updateRes.rows[0].balance,
        denomination: denom,
        count: count,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`❌ /currency/withdraw error: ${logError(error)}`);
      res.status(400).json({ error: logError(error) });
    } finally {
      client.release();
    }
  });

  // --- /api/currency/top ---
  router.get("/currency/top", async (req, res) => {
    try {
      const result = await db.query(
        `SELECT name, balance FROM user_funds ORDER BY balance DESC LIMIT 10`
      );
      res.json(result.rows);
    } catch (error) {
      logger.error(`❌ /currency/top error: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
