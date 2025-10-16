import { status } from "minecraft-server-util";
import { syncAndImportStats } from "../syncAndImportStats.js";
import logger from "../../../logger.js";
import { exitIfNotProduction } from "../../../utils/production/onlyInProduction.js";

/**
 * Starts the periodic stat syncing process.
 * @param {import('pg').Pool} db
 * @param {string} serverIP
 * @param {number} serverPort
 */
export function startStatSyncScheduler(db, serverIP, serverPort) {
  if (!exitIfNotProduction()) return;

  let lastWasZero = false;
  let lastSyncTime = 0;

  async function maybeRunStatSync() {
    try {
      const { players } = await status(serverIP, serverPort, { timeout: 5000 });
      const count = players.online;
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (count === 0 && !lastWasZero) {
        lastWasZero = true;
        logger.info("0 players online — running stats sync...");
        await syncAndImportStats(db, logger);
        lastSyncTime = now;
      } else if (count > 0) {
        lastWasZero = false;

        if (now - lastSyncTime >= oneHour) {
          logger.info("Players online — hourly stats sync running...");
          await syncAndImportStats(db);
          lastSyncTime = now;
        }
      }
    } catch (error) {
      logger.error("Failed to check player count for sync:", error);
    }
  }

  maybeRunStatSync();
  setInterval(maybeRunStatSync, 10 * 60 * 1000);
}
