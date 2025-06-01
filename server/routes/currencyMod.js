import express from "express";
import logError from "../utils/logError.js";
import logger from "../logger.js";
import jwt from "jsonwebtoken";

// middleware
import verifyJWT from "../middleware/verifyJWT.js";

// utils
import { logTransactions } from "../utils/logTransactions.js";

export default function currencyRoutes(db) {
  const router = express.Router();

  router.post("/currency/login", (req, res) => {
    const { uuid, name } = req.body;

    if (!uuid || !name) {
      return res.status(400).json({ error: "Missing uuid or name" });
    }

    const token = jwt.sign({ uuid, name }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res.json({ token });
  });

  router.use("/currency", verifyJWT);

  // --- /api/currency/balance ---
  router.get("/currency/balance", async (req, res) => {
    const uuid = req.user.uuid;

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
    const { to_uuid, amount } = req.body;
    const from_uuid = req.user.uuid;

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
    const { amount } = req.body;
    const uuid = req.user.uuid;

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
    const { count, denomination } = req.body;
    const uuid = req.user.uuid;

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

  // --- /api/currency/mob-limit ---
  router.post("/currency/mob-limit", async (req, res) => {
    const uuid = req.user.uuid;

    if (!uuid) {
      return res.status(400).json({ error: "Missing uuid" });
    }

    try {
      await db.query(
        `INSERT INTO mob_limit_reached (uuid, date_reached) 
       VALUES ($1, CURRENT_DATE)
       ON CONFLICT (uuid) DO UPDATE SET date_reached = CURRENT_DATE`,
        [uuid]
      );

      res.json({ success: true, message: "Mob limit marked for user" });
    } catch (error) {
      logger.error(`❌ /currency/mob-limit error: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/currency/mob-limit GET (check limit)
  router.get("/currency/mob-limit", async (req, res) => {
    const uuid = req.user.uuid;

    if (!uuid) {
      return res.status(400).json({ error: "Missing uuid" });
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM mob_limit_reached WHERE uuid = $1 AND date_reached = CURRENT_DATE LIMIT 1`,
        [uuid]
      );

      const limitReached = result.rowCount > 0;
      res.json({ limitReached });
    } catch (error) {
      logger.error(`❌ /currency/mob-limit GET error: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/currency/test-ip", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const normalizedIp = ip.replace("::ffff:", "");
    logger.info(`Received request from IP: ${normalizedIp}`);
    res.json({ ip: normalizedIp });
  });

  return router;
}
