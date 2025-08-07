import logger from "../../../logger.js";

/**
 * Updates the balance of the main server company (ID: 1000) in the `company_funds` table.
 *
 * The balance is computed by summing:
 *  - All user balances from `user_funds`
 *  - Total value of all tokens held by users (`user_tokens.amount * crypto_tokens.price_per_unit`)
 *  - The `tax_collected` value from `memecoin_tax_tracker` (only row with id = 1)
 *
 * If a record for company_id = 1000 already exists, it is updated. Otherwise, it is inserted.
 *
 * @param {import("pg").Pool} db - PostgreSQL database pool.
 * @returns {Promise<void>}
 */
export async function updateServerCompanyBalance(db) {
  try {
    const userFundsRes = await db.query(`
      SELECT COALESCE(SUM(balance), 0) AS total_user_funds
      FROM user_funds
    `);
    const totalUserFunds = Number(userFundsRes.rows[0].total_user_funds);

    const tokenRes = await db.query(`
      SELECT ut.amount, ct.price_per_unit
      FROM user_tokens ut
      JOIN crypto_tokens ct ON ut.token_id = ct.id
    `);
    const totalTokenValue = tokenRes.rows.reduce(
      (acc, { amount, price_per_unit }) => {
        return acc + Number(amount) * Number(price_per_unit);
      },
      0
    );

    const taxRes = await db.query(`
      SELECT COALESCE(total_collected, 0) AS total_collected
      FROM memecoin_tax_tracker
      WHERE id = 1
    `);
    const taxCollected = Number(taxRes.rows[0]?.total_collected || 0);

    const totalBalance = totalUserFunds + totalTokenValue + taxCollected;

    await db.query(
      `
      INSERT INTO company_funds (company_id, balance)
      VALUES (1000, $1)
      ON CONFLICT (company_id)
      DO UPDATE SET balance = EXCLUDED.balance
    `,
      [totalBalance]
    );

    logger.info(
      `Updated main server company (ID: 1000) balance to $${totalBalance.toFixed(
        2
      )}`
    );
  } catch (err) {
    logger.error(
      `❌ Failed to update main server company balance: ${err.message}`
    );
  }
}
