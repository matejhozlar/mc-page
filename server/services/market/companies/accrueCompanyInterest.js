import logger from "../../../logger.js";
import config from "../../../config/index.js";

/**
 * Accrues hourly interest for all companies with a positive balance.
 *
 * - COMPANY_INTEREST_RATE: per-hour decimal (e.g. 0.0005 = 0.05%/hr)
 * - COMPANY_INTEREST_MIN_BALANCE: min balance to qualify (default 0)
 * - COMPANY_INTEREST_EXCLUDE: comma-separated company IDs to skip (e.g. "1000")
 *
 * @param {import("pg").Pool} db
 * @param {object} [opts]
 * @param {number} [opts.ratePerHour] e.g. 0.0005 = 0.05% per hour
 * @param {number} [opts.minBalance]
 * @param {number[]} [opts.excludeIds]
 */
const {
  COMPANY_INTEREST_RATE,
  COMPANY_INTEREST_MIN_BALANCE,
  COMPANY_INTEREST_EXCLUDE,
} = config.companies;
export async function accrueCompanyInterest(
  db,
  {
    ratePerHour = Number(COMPANY_INTEREST_RATE ?? 0.0005),
    minBalance = Number(COMPANY_INTEREST_MIN_BALANCE ?? 0),
    excludeIds = (COMPANY_INTEREST_EXCLUDE || "")
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n)),
  } = {}
) {
  if (!(ratePerHour > 0)) {
    logger.warn("⏸️ accrueCompanyInterest: ratePerHour <= 0, skipping.");
    return;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows: companies } = await client.query(
      `
      SELECT cf.company_id, cf.balance
      FROM company_funds cf
      WHERE cf.balance > $1
    `,
      [minBalance]
    );

    let updatedCount = 0;
    for (const row of companies) {
      const companyId = Number(row.company_id);
      if (excludeIds.includes(companyId)) continue;

      const balanceBefore = Number(row.balance);
      if (!(balanceBefore > 0)) continue;

      const interestRaw = balanceBefore * ratePerHour;
      const interest = Math.round(interestRaw * 100) / 100;

      if (interest <= 0) continue;

      const balanceAfter = Math.round((balanceBefore + interest) * 100) / 100;

      await client.query(
        `UPDATE company_funds SET balance = $1 WHERE company_id = $2`,
        [balanceAfter, companyId]
      );

      await client.query(
        `INSERT INTO company_interest_ledger
         (company_id, interest_amount, rate_per_hour, balance_before, balance_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [companyId, interest, ratePerHour, balanceBefore, balanceAfter]
      );

      updatedCount++;
    }

    await client.query("COMMIT");
    logger.info(
      `💸 Accrued hourly interest at rate=${ratePerHour} to ${updatedCount} company(ies).`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`❌ accrueCompanyInterest failed: ${err.message}`);
  } finally {
    client.release();
  }
}
