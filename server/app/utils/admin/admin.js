import logger from "../../../logger.js";

/**
 * Checks whether a given Discord user ID is an admin by querying the `admins` table.
 *
 * @param {import('pg').Pool} db - PostgreSQL database connection pool.
 * @param {string} discordId - The Discord user ID to check.
 * @returns {Promise<boolean>} - Returns true if the user is an admin, false otherwise.
 */
export const isAdmin = async (db, discordId) => {
  if (!discordId) return false;

  try {
    const result = await db.query(
      `SELECT 1 FROM admins WHERE discord_id = $1 LIMIT 1`,
      [discordId]
    );
    return result.rowCount > 0;
  } catch (error) {
    logger.error("Admin check failed:", error);
    return false;
  }
};
