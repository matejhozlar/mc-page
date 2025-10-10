import dotenv from "dotenv";
dotenv.config({ quiet: true });
import { validateEnv } from "./config/env/validate-env";
validateEnv();

import http from "http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./app";

import { setupSocketIO } from "./socket/index";
import { initIO } from "./socket/io";

import logger from "./logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactBuildPath = path.join(__dirname, "..", "..", "client", "dist");

const PORT = process.env.PORT;
const serverIP = process.env.COGS_AND_STEAM_SERVER_IP;
const serverPort = Number(process.env.COGS_AND_STEAM_SERVER_PORT);

const app = createApp();
const httpServer = http.createServer(app);

const io = initIO(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});

app.get("/*", (req, res) => {
  res.sendFile(path.join(reactBuildPath, "index.html"));
});

process.on("SIGINT", async () => {
  logger.info("Gracefully shutting down...");

  try {
    // Close WebSocket server
    io.close();

    // Close HTTP server
    httpServer.close(() => {
      logger.info("Server closed. Exiting...");
      process.exit(0);
    });
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
});
