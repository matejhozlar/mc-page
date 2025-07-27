import { scheduleReminders } from "./reminders.js";
import { scheduleCleanupJobs } from "./cleanup.js";
import { schedulePriceUpdates } from "./priceUpdates.js";
import { schedulePortfolioSnapshots } from "./portfolio.js";
import { scheduleQuestJobs } from "./quests.js";

export function setupCronJobs(db, clientBot, webBot) {
  try {
    scheduleReminders(webBot);
  } catch (err) {
    console.error("❌ Failed to scheduleReminders:", err);
  }

  try {
    scheduleCleanupJobs(db);
  } catch (err) {
    console.error("❌ Failed to scheduleCleanupJobs:", err);
  }

  try {
    schedulePriceUpdates(db);
  } catch (err) {
    console.error("❌ Failed to schedulePriceUpdates:", err);
  }

  try {
    schedulePortfolioSnapshots(db);
  } catch (err) {
    console.error("❌ Failed to schedulePortfolioSnapshots:", err);
  }

  try {
    scheduleQuestJobs(db, clientBot);
  } catch (err) {
    console.error("❌ Failed to scheduleQuestJobs:", err);
  }
}
