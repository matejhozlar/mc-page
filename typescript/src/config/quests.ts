export interface QuestsConfig {
  DAILY_QUEST_COUNT: number;
  MAX_BASE_REWARD: number;
  PRICE_PENALTY_MULTIPLIER: number;
  MAX_PRICE_BONUS: number;
  MAX_PLAYTIME_FOR_BONUS: number;
  MIN_PLC_PRICE: number;
  MAX_PLC_PRICE: number;
}

const quests = {
  /**
   * Number of daily shared quests players must complete.
   * Affects:
   * - Completion ratio (used to scale final token rewards).
   * - How many quests are selected daily.
   */
  DAILY_QUEST_COUNT: 3,
  /**
   * The maximum base reward (in tokens) a player can earn
   * after playing for a full eligible period (3+ hours).
   * Affects:
   * - The base reward calculation: (hoursPlayed / DAILY_QUEST_COUNT) * MAX_BASE_REWARD
   * - Caps rewards at this value.
   */
  MAX_BASE_REWARD: 100,
  /**
   * Token price multiplier applied when no quests were completed.
   * Affects:
   * - Price drop when the community fails to complete quests.
   * - Example: 0.9 = price drops by 10%
   */
  PRICE_PENALTY_MULTIPLIER: 0.9,

  /**
   * Maximum bonus amount that can be added to the token price
   * when quests are completed and playtime is high.
   * Affects:
   * - How much the price can increase in a single daily cycle.
   */
  MAX_PRICE_BONUS: 0.15,

  /**
   * Total playtime (in hours) required across all players
   * to reach the full bonus potential.
   * Affects:
   * - Scaling of bonus: playtime beyond this cap doesn't increase price bonus.
   */
  MAX_PLAYTIME_FOR_BONUS: 8,

  /**
   * The lowest price the token is allowed to fall to, regardless of penalties.
   * Prevents the token from crashing below this floor.
   */
  MIN_PLC_PRICE: 1,

  /**
   * The highest price the token is allowed to rise to, even with max bonuses.
   * Prevents runaway price inflation.
   */
  MAX_PLC_PRICE: 5,
} satisfies QuestsConfig;

export default quests;
