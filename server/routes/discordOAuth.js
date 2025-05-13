import express from "express";
import axios from "axios";
import logger from "../logger.js";
import logError from "../utils/logError.js";

export default function discordOAuthRoutes(db) {
  const router = express.Router();

  // --- /api//discord/callback-game ---
  router.post("/discord/callback-game", async (req, res) => {
    const code = req.body.code;
    logger.info(`🎮 Received Discord login code for game: ${code}`);

    try {
      const tokenRes = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: process.env.DISCORD_LOGIN_CLIENT_ID,
          client_secret: process.env.DISCORD_LOGIN_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.DISCORD_LOGIN_REDIRECT_URI,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const accessToken = tokenRes.data.access_token;

      const userRes = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const discordUser = userRes.data;
      const discordId = discordUser.id;

      const dbUser = await db.query(
        `SELECT * FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      if (dbUser.rowCount === 0) {
        return res.status(403).json({ error: "Not a registered user." });
      }

      res.cookie("user_session", discordId, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 1000 * 60 * 60 * 24,
      });

      logger.info(`🎉 Game session started for user: ${discordUser.username}`);
      res.status(200).json({ success: true, discordId });
    } catch (error) {
      logger.error(`❌ Game login failed: ${logError(error)}`);
      res.status(500).json({ error: "OAuth error" });
    }
  });

  // --- /api/discord-callback ---
  router.post("/discord/callback", async (req, res) => {
    const code = req.body.code;
    logger.info(`🔐 Received Discord OAuth callback with code: ${code}`);

    try {
      const tokenRes = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: process.env.ADMIN_CLIENT_ID,
          client_secret: process.env.ADMIN_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.ADMIN_REDIRECT_URI,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const accessToken = tokenRes.data.access_token;
      logger.info("✅ OAuth token exchange successful.");

      const userRes = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const user = userRes.data;
      logger.info(`👤 Fetched Discord user: ${user.username} (${user.id})`);

      const result = await db.query(
        `SELECT 1 FROM admins WHERE discord_id = $1 LIMIT 1`,
        [user.id]
      );

      const isAdmin = result.rowCount > 0;

      if (!isAdmin) {
        return res.status(403).json({ error: "Not an admin." });
      }

      res.cookie("admin_session", user.id, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 1000 * 60 * 60 * 24,
      });

      logger.info(`🔓 Admin session started for ${user.username} (${user.id})`);
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error(`OAuth or admin check error: ${logError(error)}`);
      res.status(500).json({ error: "OAuth error" });
    }
  });

  return router;
}
