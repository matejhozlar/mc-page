import logger from "../../../logger.js";

/**
 * Cleans up a token history table by removing old rows beyond a maximum entry limit per token.
 *
 * @param {import("pg").Pool} db - PostgreSQL database pool or client instance.
 * @param {string} tableName - Name of the table to clean (must contain `token_id` and `recorded_at` columns).
 * @param {number} [maxEntries=144] - Maximum number of rows to keep per token.
 * @param {number} [deleteBatch=100] - Number of extra rows to delete in a batch (soft buffer).
 * @returns {Promise<void>}
 */
export async function cleanupTokenHistoryTable(
  db,
  tableName,
  maxEntries = 144,
  deleteBatch = 100
) {
  try {
    const { rows } = await db.query(`
      SELECT token_id, COUNT(*) AS count
      FROM ${tableName}
      GROUP BY token_id
    `);

    for (const row of rows) {
      const tokenId = row.token_id;
      const count = parseInt(row.count, 10);

      if (count > maxEntries) {
        const toDelete = count - maxEntries + deleteBatch;

        await db.query(
          `
          DELETE FROM ${tableName}
          WHERE ctid IN (
            SELECT ctid FROM ${tableName}
            WHERE token_id = $1
            ORDER BY recorded_at ASC
            LIMIT $2
          )
        `,
          [tokenId, toDelete]
        );

        logger.info(
          `🧹 Cleaned ${toDelete} rows from ${tableName} for token ${tokenId}`
        );
      }
    }
  } catch (error) {
    logger.error(`❌ Failed to clean ${tableName}: ${error}`);
  }
}
