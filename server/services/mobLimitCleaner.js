import logger from "../logger.js";
import logError from "../utils/logError";

export async function runMobLimitCleaner(db) {
  try {
    logger.info("🚀 Starting mob_limit_reached table cleanup...");

    await db.query("DELETE FROM mob_limit_reached");
    logger.info("✅ mob_limit_reached table successfully truncated.");

    await db.query(
      `INSERT INTO job_history (job_name, last_run)
            VALUES ($1, NOW())
            ON CONFLICT (job_name)
            DO UPDATE SET last_run = NOW()`,
      ["mob_limit_cleaner"]
    );

    logger.info("✅ job_history updated.");
  } catch (error) {
    logger.error(`❌ Failed to run mob limit cleaner: ${logError(error)}`);
  }
}
