// routes/cryptoMod.js
import express from "express";
import logger from "../logger.js";
import logError from "../utils/logError.js";

export default function cryptoRoutes(db) {
  const router = express.Router();

  // --- /api/market/tokens ---
  router.get("/market/tokens", async (req, res) => {
    try {
      const result = await db.query(
        `SELECT id, name, symbol, total_supply, price_per_unit, description, available_supply FROM crypto_tokens ORDER BY id ASC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error(`❌ Failed to fetch market tokens: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
