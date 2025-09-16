import logger from "../../logger.js";
/**
 * Finalizes playtime tracking for users with an active session.
 * - Calculates how many seconds each user has played since their last `session_start`.
 * - Inserts that duration into the `daily_playtime` table for the previous day.
 * - Updates each user's `session_start` to the current time.
 *
 * Intended to run as a scheduled job once daily (e.g., at 6 AM CET).
 *
 * @param {import("pg").Pool} db - PostgreSQL connection pool.
 * @returns {Promise<void>}
 */
export async function finalizeDailyPlaytime(db) {
  try {
    const { rows } = await db.query(`
      SELECT uuid, session_start
      FROM users
      WHERE session_start IS NOT NULL
    `);

    const now = new Date();

    for (const user of rows) {
      const sessionStart = new Date(user.session_start);
      const sessionSeconds = Math.floor((now - sessionStart) / 1000);

      await db.query(
        `
        INSERT INTO daily_playtime (uuid, play_date, seconds_played)
        VALUES ($1, CURRENT_DATE - INTERVAL '1 day', $2)
        ON CONFLICT (uuid, play_date)
        DO UPDATE SET seconds_played = daily_playtime.seconds_played + EXCLUDED.seconds_played
      `,
        [user.uuid, sessionSeconds]
      );

      await db.query(
        `
        UPDATE users
        SET session_start = NOW()
        WHERE uuid = $1
      `,
        [user.uuid]
      );
    }

    logger.info(`Finalized playtime for ${rows.length} users @ 6 AM CET`);
  } catch (error) {
    logger.error(`Failed to finalize daily playtime:`, error);
  }
}
