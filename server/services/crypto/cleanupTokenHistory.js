import logger from "../../logger.js";
import logError from "../../utils/logError.js";

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
    logger.error(`❌ Failed to clean ${tableName}: ${logError(error)}`);
  }
}
