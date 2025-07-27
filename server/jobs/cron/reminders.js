import cron from "node-cron";
import { sendDailyReminder } from "../../discord/listeners/web/sendDailyReminder.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

/**
 * Schedules periodic reminders to be sent in Discord.
 *
 * Currently:
 * - Every 4 hours at 10 minutes past (e.g., 00:10, 04:10, 08:10, ...)
 * - Only runs in production (NODE_ENV === "production")
 *
 * @param {import("discord.js").Client} webBot - The Discord bot instance responsible for sending reminders
 */
export function scheduleReminders(webBot) {
  runOnlyInProduction(() => {
    cron.schedule("10 */4 * * *", () => {
      sendDailyReminder(webBot);
    });
  });
}
