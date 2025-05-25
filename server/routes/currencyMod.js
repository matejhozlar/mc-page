import express from "express";
import logError from "../utils/logError.js";
import logger from "../logger.js";

export default function currencyRoutes(db) {
  const router = express.Router();

  // --- /api/currency/balance ---
  router.get("/currency/balance", async (req, res) => {
    console.log("👉 /api/currency/balance called with", req.query);
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
  router.post("/currency/send", async (req, res) => {
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

      res.json({ success: true, new_sender_balance: senderBalance - amount });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`❌ /currency/send error: ${logError(error)}`);
      res.status(400).json({ error: logError(error) });
    } finally {
      client.release();
    }
  });

  return router;
}
