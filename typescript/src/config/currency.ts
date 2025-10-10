export interface CurrencyConfig {
  /**
   * The cooldown duration (in milliseconds) between global uses of the /lottery command.
   *
   * Used in:
   * - /lottery command logic to prevent frequent restarts of the lottery.
   *
   * This value enforces a global cooldown, meaning once a lottery is started,
   * no one can start another until this duration has passed.
   * Adjust this to control how often lotteries can be initiated.
   */
  LOTTERY_COOLDOWN_MS: number;
}

const currency = {
  LOTTERY_COOLDOWN_MS: 15 * 60 * 1000,
} satisfies CurrencyConfig;

export default currency;
