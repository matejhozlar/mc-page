import logger from "../../logger.js";
/**
 * Deletes all entries from the `daily_playtime` table.
 * Intended to run as a scheduled cleanup job once per day.
 *
 * @param {import("pg").Pool} db - PostgreSQL connection pool.
 * @returns {Promise<void>}
 */
export async function cleanupDailyPlaytime(db) {
  try {
    await db.query(`DELETE FROM daily_playtime`);
    logger.info("Cleared daily_playtime table @ 6:30 AM CET");
  } catch (error) {
    logger.error("Failed to clear daily_playtime table:", error);
  }
}
