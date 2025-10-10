export interface StablecoinsConfig {
  DEFAULT_LAST_PRICE: number;
  PLAYER_ACTIVITY_INTERVAL: number;
  INFLATION_RATE_PER_PLAYER: number;
  DECAY_RATE: number;
  FLOOR_PRICE: number;
}

const stablecoins = {
  /**
   * The default price to fall back to if no prior price history is found.
   * Used when calculating the first price update.
   */
  DEFAULT_LAST_PRICE: 1,

  /**
   * Number of seconds considered to represent one "active player" interval.
   * If the total time delta between playtime snapshots is 300 seconds (5 minutes),
   * it's counted as one unit of player activity.
   */
  PLAYER_ACTIVITY_INTERVAL: 300,

  /**
   * Price increase applied per active player detected.
   * For each activity unit (based on `PLAYER_ACTIVITY_INTERVAL`), this much value is added.
   */
  INFLATION_RATE_PER_PLAYER: 0.00025,

  /**
   * Flat price decrease when no player activity is detected between snapshots.
   * Simulates slight decay in stablecoin value due to inactivity.
   */
  DECAY_RATE: 0.00005,

  /**
   * The lowest value the token is allowed to reach.
   * Prevents price from dropping below $1 to ensure stability.
   */
  FLOOR_PRICE: 1,
} satisfies StablecoinsConfig;

export default stablecoins;
