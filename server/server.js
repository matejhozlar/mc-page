// Config
import dotenv from "dotenv";
dotenv.config();
import { validateEnv } from "./config/env/validateEnv.js";
validateEnv();

// Packages
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

// Express App
import { createApp } from "./app/index.js";
import registerRoutes from "./app/routes/index.js";

// Sockets
import { setupSocketIO } from "./socket/index.js";

// Database
import db from "./db/index.js";

// IO Sockets
import { initIO } from "./socket/io.js";

// Logger
import logger from "./logger.js";

// Discord Bots
import webBot from "./discord/bots/webBot.js";
import clientBot from "./discord/bots/clientBot.js";

// Stats Syncing
import { startStatSyncScheduler } from "./services/stats/utils/statSyncScheduler.js";
import { startPlaytimeTracking } from "./services/stats/playtimeTracker.js";

// Cron Jobs
import { setupCronJobs } from "./jobs/cron/index.js";

// GLOBAL VARIABLES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactBuildPath = path.join(__dirname, "..", "client", "dist");
const PORT = process.env.PORT;
const serverIP = process.env.SERVER_IP;
const serverPort = Number(process.env.SERVER_PORT);

const app = createApp();

const httpServer = http.createServer(app);
const io = initIO(httpServer);

// Register Routes
registerRoutes(app, { db, io, clientBot, webBot, serverIP, serverPort });

// Stats Syncing
startStatSyncScheduler(db, serverIP, serverPort);
startPlaytimeTracking(db, serverIP, serverPort);

// Setup Cron Jobs
setupCronJobs(db, clientBot, webBot);

// setup sockets
setupSocketIO(io, db, clientBot, webBot);

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

app.get("/*", (req, res) => {
  res.sendFile(path.join(reactBuildPath, "index.html"));
});

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

process.on("unhandledRejection", (reason) => {
  logger.error(`🧨 Unhandled promise rejection: ${reason}`);
});
