import express from "express";
import logger from "../logger.js";
import logError from "../utils/logError.js";

export default function verifyTokenRoute(db) {
  const router = express.Router();

  // --- /api/verify-token ---
  router.post("/verify-token", async (req, res) => {
    const { token } = req.body;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    if (!token) {
      logger.warn(
        `⚠️ Token verification attempt with missing token from ${ip}`
      );
      return res.status(400).json({ success: false, error: "Missing token" });
    }

    try {
      const result = await db.query(
        `SELECT discord_id, discord_name FROM chat_tokens
         WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        logger.warn(`⛔ Invalid or expired token attempt from ${ip}`);
        return res
          .status(401)
          .json({ success: false, error: "Token expired or invalid" });
      }

      const user = result.rows[0];
      logger.info(
        `✅ Token verified for Discord user: ${user.discord_name} (${user.discord_id}) from ${ip}`
      );

      return res.json({
        success: true,
        user: {
          id: user.discord_id,
          name: user.discord_name,
        },
      });
    } catch (error) {
      logger.error(
        `❌ Token verification failed from ${ip}: ${logError(error)}`
      );
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  });

  return router;
}
