import cron from "node-cron";
import { sendDailyReminder } from "../../discord/listeners/web/sendDailyReminder.js";

export function scheduleReminders(webBot) {
  cron.schedule("10 */4 * * *", () => {
    sendDailyReminder(webBot);
  });
}
