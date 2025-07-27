import cron from "node-cron";
import { sendDailyReminder } from "../../discord/listeners/web/sendDailyReminder.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

export function scheduleReminders(webBot) {
  runOnlyInProduction(() => {
    cron.schedule("10 */4 * * *", () => {
      sendDailyReminder(webBot);
    });
  });
}
