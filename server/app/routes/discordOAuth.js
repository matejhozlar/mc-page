import express from "express";
import axios from "axios";
import logger from "../../logger.js";

export default function discordOAuthRoutes(db) {
  const router = express.Router();

  function getRedirectUri(keyBase) {
    const isDev = process.env.NODE_ENV !== "production";
    const fullKey = isDev ? keyBase : `${keyBase}_PRODUCTION`;
    return process.env[fullKey];
  }

  // --- /api//discord/callback-crypto ---
  router.post("/discord/callback-crypto", async (req, res) => {
    const code = req.body.code;

    const redirectUri = getRedirectUri("CRYPTO_LOGIN_REDIRECT_URI");

    try {
      const tokenRes = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: process.env.CRYPTO_LOGIN_CLIENT_ID,
          client_secret: process.env.CRYPTO_LOGIN_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
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
      logger.error(`❌ Game login failed: ${error}`);
      res.status(500).json({ error: "OAuth error" });
    }
  });

  // --- /api//discord/callback-game ---
  router.post("/discord/callback-game", async (req, res) => {
    const code = req.body.code;

    const redirectUri = getRedirectUri("GAME_LOGIN_REDIRECT_URI");

    try {
      const tokenRes = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: process.env.GAME_LOGIN_CLIENT_ID,
          client_secret: process.env.GAME_LOGIN_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
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
      logger.error(`❌ Game login failed: ${error}`);
      res.status(500).json({ error: "OAuth error" });
    }
  });

  // --- /api/discord-callback ---
  router.post("/discord/callback", async (req, res) => {
    const code = req.body.code;

    const redirectUri = getRedirectUri("ADMIN_LOGIN_REDIRECT_URI");

    try {
      const tokenRes = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: process.env.ADMIN_LOGIN_CLIENT_ID,
          client_secret: process.env.ADMIN_LOGIN_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
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
      logger.error(`OAuth or admin check error: ${error}`);
      res.status(500).json({ error: "OAuth error" });
    }
  });

  // --- /api/discord/callback-market ---
  router.post("/discord/callback-market", async (req, res) => {
    const code = req.body.code;

    const redirectUri = getRedirectUri("MARKET_LOGIN_REDIRECT_URI");

    try {
      const tokenRes = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: process.env.CRYPTO_LOGIN_CLIENT_ID,
          client_secret: process.env.CRYPTO_LOGIN_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
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
        return res
          .status(403)
          .json({ error: "User not registered for market access." });
      }

      res.cookie("user_session", discordId, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 1000 * 60 * 60 * 24,
      });

      logger.info(
        `🏪 Market session started for ${discordUser.username} (${discordId})`
      );
      res.status(200).json({ success: true, discordId });
    } catch (error) {
      logger.error(`❌ Market login failed: ${error}`);
      res.status(500).json({ error: "OAuth error" });
    }
  });

  return router;
}
