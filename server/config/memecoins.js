export default {
  /**
   * The probability (0 to 1) that a token's price will go up during a simulation cycle.
   * Used in:
   * - `direction = Math.random() < UPWARD_BIAS ? 1 : -1`
   * Higher values make upward trends more likely.
   */
  UPWARD_BIAS: 0.505,

  /**
   * If a token’s price falls below this threshold, it automatically crashes to $0.
   * Used in:
   * - Crash detection logic: `if (price < CRASH_PRICE_THRESHOLD)`
   * Increase to make crashing rarer, decrease to make it more common.
   */
  CRASH_PRICE_THRESHOLD: 0.002,

  /**
   * Defines volatility behavior depending on the current token price.
   * Controls how "wild" or "stable" price movements are at different price ranges.
   */
  VOLATILITY: {
    /**
     * Used when price < 5.
     * Simulates small daily price fluctuations typical of low-value assets.
     * `MIN` and `MAX` define the random percentage range (e.g., 1%–3%) used in:
     * `Math.random() * (MAX - MIN) + MIN`
     */
    LOW: {
      PRICE_THRESHOLD: 5,
      MIN: 0.01,
      MAX: 0.03,
    },

    /**
     * Used when 5 <= price < 1000.
     * Allows larger fluctuations than LOW, up to 10%.
     */
    MID: {
      PRICE_THRESHOLD: 1000,
      MAX: 0.1,
    },

    /**
     * Used when price >= 10000.
     * Highly stable — prices fluctuate within a tight 3% range.
     */
    HIGH: {
      PRICE_THRESHOLD: 10000,
      MAX: 0.3,
    },
  },

  // Initial Price & Supply Settings for New Memecoins

  /**
   * The maximum randomly generated initial price for a memecoin.
   * Affects:
   * - `Math.random() * INITIAL_PRICE_MAX` in `getRandomMemecoin()`
   * Higher value allows newly generated coins to start with higher prices.
   */
  INITIAL_PRICE_MAX: 1000,

  /**
   * The minimum allowed initial price for a memecoin.
   * Affects:
   * - Lower bound in `Math.max(..., INITIAL_PRICE_MIN)`
   * Prevents memecoins from starting too close to zero.
   */
  INITIAL_PRICE_MIN: 0.0001,

  /**
   * Minimum total supply when generating a memecoin.
   * Used in:
   * - `Math.random()` range when assigning total supply.
   * Higher values reduce scarcity.
   */
  TOTAL_SUPPLY_MIN: 1_000,

  /**
   * Maximum total supply when generating a memecoin.
   * Used in:
   * - `Math.random()` range for total supply assignment.
   * Controls the upper bound of how many tokens a coin can have.
   */
  TOTAL_SUPPLY_MAX: 10_000_000,
};
