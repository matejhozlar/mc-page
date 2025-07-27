import cron from "node-cron";
import { sendDailyReminder } from "../../discord/listeners/web/sendDailyReminder.js";
import { runInProduction } from "./utils/runInProduction.js";

export function scheduleReminders(webBot) {
  cron.schedule("*/5 * * * * *", () => {
    runInProduction(() => sendDailyReminder(webBot));
  });
}
