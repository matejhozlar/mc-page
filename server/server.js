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

// ─── Load Environment Variables ──────────────────────────
import dotenv from "dotenv";
dotenv.config();

// ─── Validate Environment Config ─────────────────────────
import { validateEnv } from "./config/env/validateEnv.js";
validateEnv(); // Ensure all required env vars are set

// ─── Core Node Modules ───────────────────────────────────
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

// ─── Application Setup ───────────────────────────────────
import { createApp } from "./app/index.js";
import registerRoutes from "./app/routes/index.js";

// ─── Socket.IO Setup ─────────────────────────────────────
import { setupSocketIO } from "./socket/index.js";
import { initIO } from "./socket/io.js";

// ─── Database Connection ─────────────────────────────────
import db from "./db/index.js";

// ─── Logger Utility ──────────────────────────────────────
import logger from "./logger.js";

// ─── Discord Bots ────────────────────────────────────────
import webBot from "./discord/bots/webBot.js"; // Handles web-based Discord actions
import clientBot from "./discord/bots/clientBot.js"; // Handles internal Discord ops
import { shutdownBot } from "./discord/utils/shutdownBot.js"; // Unified shutdown util

// ─── Stat Tracking Services ──────────────────────────────
import { startStatSyncScheduler } from "./services/stats/utils/statSyncScheduler.js";
import { startPlaytimeTracking } from "./services/stats/playtimeTracker.js";

// ─── Cron Jobs ───────────────────────────────────────────
import { setupCronJobs } from "./jobs/cron/index.js";

// ─── Paths & Constants ───────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactBuildPath = path.join(__dirname, "..", "client", "dist");

const PORT = process.env.PORT;
const serverIP = process.env.SERVER_IP;
const serverPort = Number(process.env.SERVER_PORT);

// ─── Express App and HTTP Server ─────────────────────────
const app = createApp(); // Initialize app with middleware
const httpServer = http.createServer(app); // Create HTTP server

// ─── Initialize Socket.IO Server ─────────────────────────
const io = initIO(httpServer); // Bind socket to HTTP server

// ─── Register REST Routes ────────────────────────────────
/**
 * Sets up API routes with dependencies.
 *
 * @param {import('express').Express} app
 * @param {Object} context
 * @param {import('pg').Pool} context.db - PostgreSQL DB instance
 * @param {import('socket.io').Server} context.io - Socket.IO server
 * @param {import('discord.js').Client} context.clientBot - Discord bot for internal ops
 * @param {import('discord.js').Client} context.webBot - Discord bot for web interactions
 * @param {string} context.serverIP - IP of the Minecraft server
 * @param {number} context.serverPort - Port of the Minecraft server
 */
registerRoutes(app, { db, io, clientBot, webBot, serverIP, serverPort });

// ─── Start Game Stat Services ────────────────────────────
startStatSyncScheduler(db, serverIP, serverPort);
startPlaytimeTracking(db, serverIP, serverPort);

// ─── Launch Cron Jobs ────────────────────────────────────
setupCronJobs(db, clientBot, webBot, io);

// ─── Setup WebSocket Channels ────────────────────────────
setupSocketIO(io, db, clientBot, webBot);

// ─── Start HTTP Server ───────────────────────────────────
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running at http://localhost:${PORT}`);
});

// ─── Serve React SPA Fallback ────────────────────────────
app.get("/*", (req, res) => {
  res.sendFile(path.join(reactBuildPath, "index.html"));
});

// ─── Graceful Shutdown Handler ───────────────────────────
/**
 * Handles Ctrl+C or `kill` signal. Cleans up resources.
 */
process.on("SIGINT", async () => {
  logger.info("Gracefully shutting down...");

  try {
    // Shutdown WebBot with notification
    await shutdownBot(webBot, {
      notify: true,
      name: "WebBot",
      message: "🔴 WebBot is going offline.",
    });

    // Shutdown ClientBot without notification
    await shutdownBot(clientBot, {
      name: "ClientBot",
    });

    // Close WebSocket server
    io.close();

    // Close database connection
    await db.end();

    // Close HTTP server
    httpServer.close(() => {
      logger.info("✅ Server closed. Exiting...");
      process.exit(0);
    });
  } catch (error) {
    logger.error(`❌ Error during shutdown: ${error}`);
    process.exit(1);
  }
});

// ─── Unhandled Promise Rejection Fallback ────────────────
process.on("unhandledRejection", (reason) => {
  logger.error(`🚨 Unhandled promise rejection: ${reason}`);
});
