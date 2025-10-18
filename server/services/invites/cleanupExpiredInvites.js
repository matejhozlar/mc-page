import logger from "../../logger.js";

/**
 * Deletes invite entries older than 7 days from the `waitlist_emails` table.
 * Intended to run as a scheduled cleanup job once per day.
 *
 * @param {import("pg").Pool} db - PostgreSQL connection pool.
 * @returns {Promise<void>}
 */
export async function cleanupExpiredInvites(db) {
  try {
    const result = await db.query(`
      DELETE FROM waitlist_emails
      WHERE submitted_at < NOW() - INTERVAL '7 days'
    `);
    logger.info("Cleaned up expired invites from waitlist_emails table");
  } catch (error) {
    logger.error("Failed to clean up expired invites:", error);
  }
}
