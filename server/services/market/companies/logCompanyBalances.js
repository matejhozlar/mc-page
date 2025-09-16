import logger from "../../../logger.js";

/**
 * Logs the current balance of each company into `company_balance_history`,
 * and trims older entries to keep only the 7 most recent per company.
 *
 * @param {import("pg").Pool} db - PostgreSQL database connection.
 */
export async function logCompanyBalances(db) {
  try {
    const { rows: companies } = await db.query(`
      SELECT company_id, balance FROM company_funds
    `);

    if (!companies.length) {
      logger.info("No companies found to log balances for.");
      return;
    }

    for (const company of companies) {
      await db.query(
        `
        INSERT INTO company_balance_history (company_id, balance, recorded_at)
        VALUES ($1, $2, NOW())
      `,
        [company.company_id, company.balance]
      );

      logger.info(
        `Logged balance for company ID ${company.company_id}: $${company.balance}`
      );

      await db.query(
        `
        DELETE FROM company_balance_history
        WHERE id IN (
          SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY recorded_at DESC) AS rn
            FROM company_balance_history
            WHERE company_id = $1
          ) sub
          WHERE sub.rn > 7
        )
      `,
        [company.company_id]
      );
    }
  } catch (err) {
    logger.error(`Failed to log company balances: ${err.message}`);
  }
}
