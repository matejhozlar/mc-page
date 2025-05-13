import { status } from "minecraft-server-util";
import logger from "../logger.js";
import logError from "../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

export function startPlaytimeTracking(db, serverIP, serverPort) {
  async function syncPlayersInBackground() {
    try {
      const response = await status(serverIP, serverPort, { timeout: 5000 });
      const onlinePlayers = response.players.sample || [];
      const onlineUUIDs = onlinePlayers.map((p) => p.id);

      for (const player of onlinePlayers) {
        await db.query(
          `
            INSERT INTO users (uuid, name, online, last_seen, session_start)
            VALUES ($1, $2, true, NOW(), NOW())
            ON CONFLICT (uuid)
            DO UPDATE SET
              name = $2,
              online = true,
              last_seen = NOW(),
              session_start = CASE
                WHEN users.online = false OR users.session_start IS NULL THEN NOW()
                ELSE users.session_start
              END
          `,
          [player.id, player.name]
        );
      }

      if (onlineUUIDs.length > 0) {
        await db.query(
          `
          UPDATE users
          SET online = false,
              last_seen = NOW(),
              play_time_seconds = play_time_seconds + EXTRACT(EPOCH FROM (NOW() - session_start)),
              session_start = NULL
          WHERE session_start IS NOT NULL AND uuid NOT IN (${onlineUUIDs
            .map((_, i) => `$${i + 1}`)
            .join(",")})
        `,
          onlineUUIDs
        );
      } else {
        await db.query(`
          UPDATE users
          SET online = false,
              last_seen = NOW(),
              play_time_seconds = play_time_seconds + EXTRACT(EPOCH FROM (NOW() - session_start)),
              session_start = NULL
          WHERE session_start IS NOT NULL
        `);
      }

      if (onlinePlayers.length > 0) {
        logger.info(
          `✅ Synced ${
            onlinePlayers.length
          } online player(s) @ ${new Date().toISOString()}`
        );
      }
    } catch (error) {
      logger.error(`❌ Background playtime sync failed: ${logError(error)}`);
    }
  }

  syncPlayersInBackground();
  setInterval(syncPlayersInBackground, 60000);
}
