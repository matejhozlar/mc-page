import logger from "../../../logger.js";

/**
 * Takes a daily snapshot of each user's crypto portfolio value
 * by summing the value of their current token holdings.
 *
 * Inserts a record into the `user_portfolio_history` table for each user.
 *
 * @param {import("pg").Pool} db - PostgreSQL pool or client instance for database access.
 * @returns {Promise<void>}
 */
export async function snapshotUserPortfolios(db) {
  try {
    const users = await db.query(
      `SELECT DISTINCT discord_id FROM user_tokens WHERE amount > 0`
    );

    for (const user of users.rows) {
      const { discord_id } = user;

      const tokens = await db.query(
        `SELECT ut.amount, ct.price_per_unit
         FROM user_tokens ut
         JOIN crypto_tokens ct ON ut.token_id = ct.id
         WHERE ut.discord_id = $1`,
        [discord_id]
      );

      const tokenValue = tokens.rows.reduce((sum, t) => {
        return sum + parseFloat(t.amount) * parseFloat(t.price_per_unit);
      }, 0);

      await db.query(
        `INSERT INTO user_portfolio_history (discord_id, total_value)
         VALUES ($1, $2)`,
        [discord_id, tokenValue.toFixed(2)]
      );
    }

    logger.info("Daily user portfolio snapshot recorded.");
  } catch (error) {
    logger.error(`Failed to record daily snapshots: ${error}`);
  }
}
