// routes/admin.js
import express from "express";
import logger from "../logger.js";
import rconLogger from "../rconLogger.js";
import logError from "../utils/logError.js";
import { isAdmin } from "../services/admin.js";
import { Rcon } from "rcon-client";

export default function adminRoutes(db) {
  const router = express.Router();

  // --- /api/admin/validate ---
  router.get("/admin/validate", async (req, res) => {
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      logger.warn("🔍 Admin validate request without session.");
      return res.status(400).json({ valid: false });
    }

    try {
      const valid = await isAdmin(db, discordId);
      logger.info(`🛂 Admin validate check: ${discordId} => ${valid}`);
      res.json({ valid });
    } catch (error) {
      logger.error(`❌ Admin validation error: ${logError(error)}`);
      res.status(500).json({ valid: false });
    }
  });

  // --- /api/admin/logout ---
  router.post("/admin/logout", (req, res) => {
    const discordId = req.cookies.admin_session;
    logger.info(`🚪 Admin logout requested for: ${discordId || "unknown"}`);

    res.clearCookie("admin_session", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    });
    res.status(200).json({ success: true });
  });

  // --- /api/admin/me ---
  router.get("/admin/me", async (req, res) => {
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      logger.warn("👤 /me requested without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`⛔ Non-admin attempted /me: ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT * FROM users WHERE discord_id = $1`,
        [discordId]
      );

      if (result.rows.length === 0) {
        logger.warn(`❓ Admin user not found in users table: ${discordId}`);
        return res.status(404).json({ error: "User not found in database" });
      }

      logger.info(`📥 Admin /me data sent for: ${discordId}`);
      res.json(result.rows[0]);
    } catch (error) {
      logger.error(`Failed to fetch admin user data: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/admin/rcon ---
  router.post("/admin/rcon", async (req, res) => {
    const { command } = req.body;
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      rconLogger.warn("⛔ RCON request denied: no session cookie");
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        rconLogger.warn(`⛔ RCON access denied for non-admin: ${discordId}`);
        return res.status(403).json({ success: false, error: "Not an admin" });
      }

      const userRes = await db.query(
        `SELECT name FROM users WHERE discord_id = $1`,
        [discordId]
      );

      const adminMcName = userRes.rows[0]?.name || "unknown";
      const isSilentCommand = /^\/v get\b/i.test(command);

      if (!isSilentCommand) {
        rconLogger.info(
          `🔐 RCON command received from ${adminMcName} (${discordId}): ${command}`
        );
      }

      const rcon = await Rcon.connect({
        host: process.env.SERVER_IP,
        port: parseInt(process.env.RCON_PORT),
        password: process.env.RCON_PASSWORD,
      });

      const response = await rcon.send(command);
      await rcon.end();

      if (!isSilentCommand) {
        await db.query(
          `INSERT INTO rcon_logs (discord_id, mc_name, command) VALUES ($1, $2, $3)`,
          [discordId, adminMcName, command]
        );

        rconLogger.info(`✅ RCON command executed successfully: ${command}`);
      }

      return res.json({ success: true, response });
    } catch (error) {
      rconLogger.error(
        `❌ RCON execution failed for ${discordId}: ${logError(error)}`
      );
      return res.status(500).json({ success: false, error: "RCON failure" });
    }
  });

  // --- /api/admin/users ---
  router.get("/admin/users", async (req, res) => {
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      logger.warn("⛔ Attempt to access /admin/users without session cookie");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(
          `⛔ Unauthorized /admin/users access attempt by ${discordId}`
        );
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT uuid, name, play_time_seconds, last_seen, online FROM users ORDER BY name ASC`
      );

      logger.info(`📊 Admin ${discordId} fetched user list.`);
      res.json({ users: result.rows });
    } catch (error) {
      logger.error(`Failed to fetch users: ${logError(error)}`);
      res.status(500).json({ error: "Database error" });
    }
  });

  // --- GET /api/admin/vanish-status ---
  router.get("/admin/vanish-status", async (req, res) => {
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      logger.warn("⛔ /vanish-status requested without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`⛔ Non-admin attempted vanish status check: ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT vanished FROM admins WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      if (result.rows.length === 0) {
        logger.warn(`❓ Admin not found in DB: ${discordId}`);
        return res.status(404).json({ error: "Admin not found" });
      }

      res.json({ vanished: result.rows[0].vanished });
    } catch (error) {
      logger.error(`❌ Failed to fetch vanish status: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- POST /api/admin/vanish-status---
  router.post("/admin/vanish-status", async (req, res) => {
    const discordId = req.cookies.admin_session;
    const { name, vanished } = req.body;

    if (!discordId) {
      logger.warn("⛔ /vanish-status update attempted without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (typeof vanished !== "boolean") {
      return res.status(400).json({ error: "Invalid vanish value" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`⛔ Non-admin tried to update vanish: ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const rcon = await Rcon.connect({
        host: process.env.SERVER_IP,
        port: parseInt(process.env.RCON_PORT),
        password: process.env.RCON_PASSWORD,
      });

      const response = await rcon.send(`/v get ${name}`);
      await rcon.end();

      if (/no player found/i.test(response)) {
        logger.warn(`⛔ Player ${name} not online — vanish not updated.`);
        return res
          .status(400)
          .json({ error: "Player must be online to update vanish status." });
      }

      await db.query(`UPDATE admins SET vanished = $1 WHERE discord_id = $2`, [
        vanished,
        discordId,
      ]);

      logger.info(`🟢 Vanish status updated: ${name} → ${vanished}`);
      res.json({ success: true });
    } catch (error) {
      logger.error(`❌ Failed to update vanish status: ${logError(error)}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
