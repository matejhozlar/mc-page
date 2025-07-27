import cron from "node-cron";
import { updateQuestProgress } from "../../services/quests/updateQuestProgress.js";
import { generateDailyQuestsAndTokenUpdate } from "../../services/quests/generateDailyQuestsAndTokenUpdate.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

export function scheduleQuestJobs(db, client) {
  const questChannel = process.env.DISCORD_QUESTS_CHANNEL_ID;

  runOnlyInProduction(() => {
    cron.schedule(
      "0 * * * *",
      () => {
        runOnlyInProduction(() =>
          updateQuestProgress(db, client, questChannel)
        );
      },
      { timezone: "Europe/Berlin" }
    );
    cron.schedule(
      "15 6 * * *",
      () => {
        generateDailyQuestsAndTokenUpdate(db, client, questChannel);
      },
      { timezone: "Europe/Berlin" }
    );
  });
}
