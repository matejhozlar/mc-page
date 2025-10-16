import logger from "../../logger.js";

/**
 * Cleans up the `mob_limit_reached` table by deleting all records,
 * then logs the cleanup operation into the `job_history` table.
 * Intended to be run as a scheduled cron job.
 *
 * @param {import("pg").Pool} db - PostgreSQL client or pool instance used for database operations.
 * @returns {Promise<void>} - Resolves when the job completes or logs an error on failure.
 */
export async function runMobLimitCleaner(db) {
  try {
    logger.info("Starting mob_limit_reached table cleanup...");

    await db.query("DELETE FROM mob_limit_reached");
    logger.info("mob_limit_reached table successfully truncated.");

    await db.query(
      `INSERT INTO job_history (job_name, last_run)
       VALUES ($1, NOW())
       ON CONFLICT (job_name)
       DO UPDATE SET last_run = NOW()`,
      ["mob_limit_cleaner"]
    );

    logger.info("job_history updated.");
  } catch (error) {
    logger.error("Failed to run mob limit cleaner:", error);
  }
}
