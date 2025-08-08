export default {
  /**
   * COMPANY_INTEREST_RATE
   *
   * - Type: Number (decimal)
   * - Unit: Per-hour interest rate (not annual or daily).
   * - Example: 0.001 = 0.1% interest added every hour.
   *
   * How it works:
   * If a company has $1,000 balance and the rate is 0.001,
   * interest for that hour = $1,000 * 0.001 = $1.00.
   *
   * Why hourly? Keeps rewards steady and gives players
   * a reason to keep funds in the company account over time.
   */
  COMPANY_INTEREST_RATE: 0.001,

  /**
   * COMPANY_INTEREST_MIN_BALANCE
   *
   * - Type: Number
   * - Unit: Currency amount (same units as your balances).
   * - Purpose: Companies must have at least this balance to earn interest.
   *
   * Example:
   * If set to 100, any company with ≤ $100 will earn NO interest.
   * This avoids cluttering your interest ledger with tiny payouts
   * and prevents abuse by creating companies with $1 to farm interest.
   */
  COMPANY_INTEREST_MIN_BALANCE: 100,

  /**
   * COMPANY_INTEREST_EXCLUDE
   *
   * - Type: String (comma-separated company IDs)
   * - Purpose: Explicitly exclude certain companies from receiving interest.
   *
   * Example:
   * "1000" means company with ID 1000 (likely your “server” company)
   * will never receive automatic interest.
   *
   * You can list multiple like: "1000,2000,3005"
   *
   * Why a string?
   * - Keeps .env or config files simple to edit.
   * - Will be parsed into an array of numbers in the code.
   */
  COMPANY_INTEREST_EXCLUDE: "1000",
};
