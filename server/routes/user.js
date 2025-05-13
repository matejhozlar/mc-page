// routes/user.js
import express from "express";
import logger from "../logger.js";
import logError from "../utils/logError.js";

export default function userRoutes(db) {
  const router = express.Router();

  // --- /api/user/validate ---
  router.get("/user/validate", async (req, res) => {
    const id = req.cookies.user_session;

    if (!id) {
      return res.status(401).json({ valid: false });
    }

    const result = await db.query(
      `SELECT name, discord_id FROM users WHERE discord_id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ valid: false });
    }

    const user = result.rows[0];
    res.json({ valid: true, ...user });
  });

  // --- /api/user/me ---
  router.get("/user/me", async (req, res) => {
    const id = req.cookies.user_session;

    if (!id) {
      logger.warn("👤 /user/me requested without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const result = await db.query(
        `SELECT * FROM users WHERE discord_id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        logger.warn(`❓ User not found in users table: ${id}`);
        return res.status(404).json({ error: "User not found" });
      }

      logger.info(`📥 /user/me data sent for: ${id}`);
      res.json(result.rows[0]);
    } catch (error) {
      logger.error(`Failed to fetch user data: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
