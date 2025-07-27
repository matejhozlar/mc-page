import cron from "node-cron";
import { updateQuestProgress } from "../../services/quests/updateQuestProgress.js";
import { generateDailyQuestsAndTokenUpdate } from "../../services/quests/generateDailyQuestsAndTokenUpdate.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

/**
 * Schedules recurring jobs related to quests:
 * - Hourly quest progress updates
 * - Daily quest generation and token rewards
 *
 * Only runs when NODE_ENV is "production".
 *
 * @param {import("pg").Pool} db - PostgreSQL database pool instance
 * @param {import("discord.js").Client} client - Discord bot client
 */
export function scheduleQuestJobs(db, client) {
  const questChannel = process.env.DISCORD_QUESTS_CHANNEL_ID;

  runOnlyInProduction(() => {
    // Run hourly: update users' quest progress
    cron.schedule(
      "0 * * * *",
      () => {
        runOnlyInProduction(() =>
          updateQuestProgress(db, client, questChannel)
        );
      },
      { timezone: "Europe/Berlin" }
    );

    // Run daily at 06:15: generate new quests and update token rewards
    cron.schedule(
      "15 6 * * *",
      () => {
        generateDailyQuestsAndTokenUpdate(db, client, questChannel);
      },
      { timezone: "Europe/Berlin" }
    );
  });
}
