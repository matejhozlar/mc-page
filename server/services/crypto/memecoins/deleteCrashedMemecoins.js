import logger from "../../../logger.js";

/**
 * Deletes memecoins from the database that have a `crashed` timestamp older than 24 hours.
 *
 * @param {import("pg").Pool} db - PostgreSQL database pool or client instance.
 * @returns {Promise<void>}
 */
export async function deleteCrashedMemecoins(db) {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM crypto_tokens
       WHERE is_memecoin = true
         AND crashed IS NOT NULL
         AND crashed < NOW() - INTERVAL '24 hours'`
    );

    if (rowCount > 0) {
      logger.info(
        `Deleted ${rowCount} crashed memecoin(s) older than 24 hours`
      );
    }
  } catch (error) {
    logger.error(`Failed to delete crashed memecoins: ${error}`);
  }
}
