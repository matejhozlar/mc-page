export interface DailyConfig {
  DAILY_REWARD_AMOUNT: number;
}

const daily = {
  /**
   * The amount of in-game currency given to a user when they claim their daily reward.
   *
   * Used in:
   * - /daily command logic for crediting user funds
   *
   * This value defines the base reward users receive once per day.
   * Adjust this to increase or decrease reward generosity.
   */
  DAILY_REWARD_AMOUNT: 50,
} satisfies DailyConfig;

export default daily;
