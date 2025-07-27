import cron from "node-cron";
import { updateQuestProgress } from "../../services/quests/updateQuestProgress.js";
import { generateDailyQuestsAndTokenUpdate } from "../../services/quests/generateDailyQuestsAndTokenUpdate.js";
import { runInProduction } from "./utils/runInProduction.js";

export function scheduleQuestJobs(db, client) {
  const questChannel = process.env.DISCORD_QUESTS_CHANNEL_ID;

  cron.schedule(
    "0 * * * *",
    () => {
      runInProduction(() => updateQuestProgress(db, client, questChannel));
    },
    { timezone: "Europe/Berlin" }
  );

  cron.schedule(
    "15 6 * * *",
    () => {
      runInProduction(() =>
        generateDailyQuestsAndTokenUpdate(db, client, questChannel)
      );
    },
    { timezone: "Europe/Berlin" }
  );
}
