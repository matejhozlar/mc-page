import express from "express";
import { status } from "minecraft-server-util";
import logError from "../utils/logError.js";
import logger from "../logger.js";

let lastPlayerCount = null;

export default function playersRoutes(
  db,
  serverIP,
  serverPort,
  sharedState = {}
) {
  const router = express.Router();

  // --- /api/playerCount ---
  const { lastLoggedCount = { value: null } } = sharedState;

  router.get("/playerCount", async (req, res) => {
    try {
      const response = await status(serverIP, serverPort, { timeout: 5000 });
      const count = response.players.online;

      if (count !== lastLoggedCount.value) {
        logger.info(
          `📊 Player count changed: ${count} online at ${serverIP}:${serverPort}`
        );
        lastLoggedCount.value = count;
      }

      res.json({ count });
    } catch (error) {
      logger.error(`Error querying server: ${logError(error)}`);
      res.status(500).json({ err: "Failed to fetch player count" });
    }
  });

  // --- /api/players ---
  router.get("/players", async (req, res) => {
    try {
      const response = await status(serverIP, serverPort, { timeout: 5000 });
      const onlinePlayers = response.players.sample || [];

      if (onlinePlayers.length !== lastPlayerCount) {
        logger.info(
          `🎮 ${onlinePlayers.length} players fetched from Minecraft server.`
        );
        lastPlayerCount = onlinePlayers.length;
      }

      for (const player of onlinePlayers) {
        try {
          await db.query(
            `INSERT INTO users (uuid, name) VALUES ($1, $2)
             ON CONFLICT (uuid) DO NOTHING`,
            [player.id, player.name]
          );
        } catch (error) {
          logger.warn(
            `⚠️ Failed to insert player ${player.name}: ${logError(error)}`
          );
        }
      }

      const result = await db.query(
        `SELECT uuid as id, name, online, last_seen, play_time_seconds, session_start
         FROM users
         WHERE last_seen IS NOT NULL
         ORDER BY online DESC, name`
      );

      res.json({ players: result.rows });
    } catch (error) {
      logger.error(
        `❌ Error fetching or processing player list: ${logError(error)}`
      );
      res.status(500).json({ error: "Could not fetch players" });
    }
  });

  return router;
}
