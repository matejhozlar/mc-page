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
        const { rows: loggingOutUsers } = await db.query(
          `
    SELECT uuid, session_start
    FROM users
    WHERE session_start IS NOT NULL
      AND uuid NOT IN (${onlineUUIDs.map((_, i) => `$${i + 1}`).join(",")})
  `,
          onlineUUIDs
        );

        for (const user of loggingOutUsers) {
          const sessionStart = new Date(user.session_start);
          const now = new Date();
          const sessionSeconds = Math.floor((now - sessionStart) / 1000);

          await db.query(
            `
      UPDATE users
      SET online = false,
          last_seen = NOW(),
          play_time_seconds = play_time_seconds + $2,
          session_start = NULL
      WHERE uuid = $1
    `,
            [user.uuid, sessionSeconds]
          );

          await db.query(
            `
      INSERT INTO daily_playtime (uuid, play_date, seconds_played)
      VALUES ($1, CURRENT_DATE, $2)
      ON CONFLICT (uuid, play_date)
      DO UPDATE SET seconds_played = daily_playtime.seconds_played + EXCLUDED.seconds_played
    `,
            [user.uuid, sessionSeconds]
          );
        }
      } else {
        const { rows: loggingOutUsers } = await db.query(`
    SELECT uuid, session_start
    FROM users
    WHERE session_start IS NOT NULL
  `);

        for (const user of loggingOutUsers) {
          const sessionStart = new Date(user.session_start);
          const now = new Date();
          const sessionSeconds = Math.floor((now - sessionStart) / 1000);

          await db.query(
            `
      UPDATE users
      SET online = false,
          last_seen = NOW(),
          play_time_seconds = play_time_seconds + $2,
          session_start = NULL
      WHERE uuid = $1
    `,
            [user.uuid, sessionSeconds]
          );

          await db.query(
            `
      INSERT INTO daily_playtime (uuid, play_date, seconds_played)
      VALUES ($1, CURRENT_DATE, $2)
      ON CONFLICT (uuid, play_date)
      DO UPDATE SET seconds_played = daily_playtime.seconds_played + EXCLUDED.seconds_played
    `,
            [user.uuid, sessionSeconds]
          );
        }
      }

      if (onlinePlayers.length > 0) {
        logger.info(
          `✅ Synced ${
            onlinePlayers.length
          } online player(s) @ ${new Date().toISOString()}`
        );
      }

      const { rows } = await db.query(`
        SELECT SUM(play_time_seconds + 
          CASE 
            WHEN online AND session_start IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (NOW() - session_start)) 
            ELSE 0 
          END
        ) AS total
        FROM users
      `);

      const totalPlaytimeSeconds = Number(rows[0]?.total || 0);

      await db.query(
        `INSERT INTO server_playtime_snapshots (total_seconds) VALUES ($1)`,
        [totalPlaytimeSeconds]
      );

      await db.query(`
  DELETE FROM server_playtime_snapshots
  WHERE id NOT IN (
    SELECT id FROM server_playtime_snapshots
    ORDER BY snapshot_time DESC
    LIMIT 20
  )
`);
    } catch (error) {
      logger.error(`❌ Background playtime sync failed: ${logError(error)}`);
    }
  }

  syncPlayersInBackground();
  setInterval(syncPlayersInBackground, 60000);
}
