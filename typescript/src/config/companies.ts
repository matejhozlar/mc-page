// src/config/companies.ts

export interface CompaniesConfig {
  /** Per-hour interest rate (e.g. 0.001 = 0.1%/hour) */
  COMPANY_INTEREST_RATE: number;
  /** Minimum balance to earn interest */
  COMPANY_INTEREST_MIN_BALANCE: number;
  /**
   * Comma-separated company IDs to exclude from interest.
   * Kept as a string for easy editing in config/.env; parse via helper below.
   */
  COMPANY_INTEREST_EXCLUDE: string;
}

const companies = {
  /**
   * COMPANY_INTEREST_RATE
   *
   * - Type: Number (decimal)
   * - Unit: Per-hour interest rate (not annual or daily).
   * - Example: 0.001 = 0.1% interest added every hour.
   *
   * If a company has $1,000 balance and the rate is 0.001,
   * interest for that hour = $1,000 * 0.001 = $1.00.
   */
  COMPANY_INTEREST_RATE: 0.001,

  /**
   * COMPANY_INTEREST_MIN_BALANCE
   *
   * - Type: Number
   * - Unit: Currency amount (same units as your balances).
   * - Purpose: Companies must have at least this balance to earn interest.
   */
  COMPANY_INTEREST_MIN_BALANCE: 100,

  /**
   * COMPANY_INTEREST_EXCLUDE
   *
   * - Type: String (comma-separated company IDs)
   * - Example: "1000,2000,3005"
   */
  COMPANY_INTEREST_EXCLUDE: "1000",
} satisfies CompaniesConfig;

export default companies;
