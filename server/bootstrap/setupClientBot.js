import logger from "../logger.js";
import { exitIfNotProduction } from "../utils/production/onlyInProduction.js";

// Roles
import { assignTopPlayerRole } from "../services/roles/assignTopPlayerRole.js";
import { assignPlaytimeRole } from "../services/roles/assignPlaytimeRoles.js";

// Leaderboards
import {
  initStatsChampionsBoard,
  updateStatsChampionsBoard,
} from "../services/leaderboards/statsChampionsBoard.js";
import {
  initMarketLeaderboard,
  updateMarketLeaderboard,
} from "../services/leaderboards/marketBoard.js";

const hourlyMs = 60 * 60 * 1000;

/**
 * Initializes scheduled jobs and leaderboards for the client Discord bot.
 * Only runs in production environments.
 *
 * @param {import('pg').Pool} db - The PostgreSQL database connection pool.
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @returns {Promise<void>}
 */
export default async function setupClientBot(db, client) {
  if (!exitIfNotProduction()) return;

  const leaderboardChannelId = process.env.DISCORD_LEADERBOARDS_CHANNEL_ID;

  // Top Player Role
  assignTopPlayerRole(db, client);
  setInterval(() => assignTopPlayerRole(db, client), hourlyMs);

  // Playtime Role
  assignPlaytimeRole(db, client, true);
  setInterval(() => assignPlaytimeRole(db, client, false), hourlyMs);

  // Stats Champion Board
  await initStatsChampionsBoard(db, client, leaderboardChannelId);
  setInterval(() => {
    logger.info("Auto-refreshing stats champions leaderboard...");
    updateStatsChampionsBoard(db);
  }, hourlyMs);

  // Market Board
  await initMarketLeaderboard(db, client, leaderboardChannelId);
  setInterval(() => {
    logger.info("Auto-refreshing market leaderboard...");
    updateMarketLeaderboard(db);
  }, hourlyMs);
}
