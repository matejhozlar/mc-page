import type { Pool, PoolClient } from "pg";
import logger from "../../../logger";

type Db = Pool | PoolClient;

/**
 * Checks whether a given Discord user ID is an admin by querying the `admins` table.
 *
 * @param {import('pg').Pool} db - PostgreSQL database connection pool.
 * @param {string} discordId - The Discord user ID to check.
 * @returns {Promise<boolean>} - Returns true if the user is an admin, false otherwise.
 */
export async function isAdmin(db: Db, discordId: string): Promise<boolean> {
  if (!discordId) return false;

  try {
    const result = await db.query(
      `SELECT 1 FROM admins WHERE discord_id = $1 LIMIT 1`,
      [discordId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logger.error(
      `Admin check failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

export default isAdmin;
