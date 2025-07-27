/**
 * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 * ┃                 MAIN SERVER ENTRY POINT               ┃
 * ┃ This file initializes the entire backend application: ┃
 * ┃ - Loads environment configuration                     ┃
 * ┃ - Sets up Express HTTP server and routes              ┃
 * ┃ - Integrates Socket.IO for WebSocket support          ┃
 * ┃ - Connects to the PostgreSQL database                 ┃
 * ┃ - Starts Discord bots and game-related schedulers     ┃
 * ┃ - Boots up cron jobs and stat sync workers            ┃
 * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

// ─── Config & Environment ────────────────────────────────
import dotenv from "dotenv";
dotenv.config();

import { validateEnv } from "./config/env/validateEnv.js";
validateEnv(); // Ensure all required env vars are set

// ─── Node.js Core Packages ───────────────────────────────
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

// ─── App Setup ────────────────────────────────────────────
import { createApp } from "./app/index.js";
import registerRoutes from "./app/routes/index.js";

// ─── Socket.IO Setup ─────────────────────────────────────
import { setupSocketIO } from "./socket/index.js";
import { initIO } from "./socket/io.js";

// ─── Database ────────────────────────────────────────────
import db from "./db/index.js";

// ─── Logging ─────────────────────────────────────────────
import logger from "./logger.js";

// ─── Discord Bots ────────────────────────────────────────
import webBot from "./discord/bots/webBot.js"; // For web interaction
import clientBot from "./discord/bots/clientBot.js"; // For internal usage

// ─── Stat Tracking & Sync ────────────────────────────────
import { startStatSyncScheduler } from "./services/stats/utils/statSyncScheduler.js";
import { startPlaytimeTracking } from "./services/stats/playtimeTracker.js";

// ─── Cron Jobs ───────────────────────────────────────────
import { setupCronJobs } from "./jobs/cron/index.js";

// ─── Paths & Runtime Info ────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactBuildPath = path.join(__dirname, "..", "client", "dist");

const PORT = process.env.PORT;
const serverIP = process.env.SERVER_IP;
const serverPort = Number(process.env.SERVER_PORT);

// ─── Express App and HTTP Server ─────────────────────────
const app = createApp();
const httpServer = http.createServer(app);

// ─── Initialize Socket.IO ────────────────────────────────
const io = initIO(httpServer);

// ─── Register Express Routes ─────────────────────────────
/**
 * @function registerRoutes
 * @param {import('express').Express} app - Express app instance
 * @param {Object} context
 * @param {import('pg').Pool} context.db - PostgreSQL DB instance
 * @param {import('socket.io').Server} context.io - Initialized Socket.IO server
 * @param {import('discord.js').Client} context.clientBot - Discord bot for internal ops
 * @param {import('discord.js').Client} context.webBot - Discord bot for web interactions
 * @param {string} context.serverIP - IP of the Minecraft server
 * @param {number} context.serverPort - Port of the Minecraft server
 */
registerRoutes(app, { db, io, clientBot, webBot, serverIP, serverPort });

// ─── Start Stat Sync & Playtime Tracker ──────────────────
startStatSyncScheduler(db, serverIP, serverPort);
startPlaytimeTracking(db, serverIP, serverPort);

// ─── Start Cron Jobs ─────────────────────────────────────
setupCronJobs(db, clientBot, webBot);

// ─── Setup WebSocket Channels ────────────────────────────
setupSocketIO(io, db, clientBot, webBot);

// ─── Start HTTP Server ───────────────────────────────────
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});

// ─── Serve React SPA Fallback ────────────────────────────
app.get("/*", (req, res) => {
  res.sendFile(path.join(reactBuildPath, "index.html"));
});

// ─── Graceful Shutdown Handler ───────────────────────────
process.on("SIGINT", async () => {
  logger.info("🧹 Gracefully shutting down...");
  try {
    await db.end();
    io.close();
    httpServer.close(() => {
      logger.info("✅ Server closed. Exiting...");
      process.exit(0);
    });
  } catch (error) {
    logger.error(`❌ Error during shutdown: ${error}`);
    process.exit(1);
  }
});

// ─── Handle Unhandled Promise Rejections ─────────────────
process.on("unhandledRejection", (reason) => {
  logger.error(`🧨 Unhandled promise rejection: ${reason}`);
});
