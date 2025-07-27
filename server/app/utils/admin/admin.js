import logger from "../../../logger.js";

export const isAdmin = async (db, discordId) => {
  if (!discordId) return false;

  try {
    const result = await db.query(
      `SELECT 1 FROM admins WHERE discord_id = $1 LIMIT 1`,
      [discordId]
    );
    return result.rowCount > 0;
  } catch (error) {
    logger.error(`❌ Admin check failed: ${error}`);
    return false;
  }
};
