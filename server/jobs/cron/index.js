import { scheduleReminders } from "./reminders.js";
import { scheduleCleanupJobs } from "./cleanup.js";
import { schedulePriceUpdates } from "./priceUpdates.js";
import { schedulePortfolioSnapshots } from "./portfolio.js";
import { scheduleQuestJobs } from "./quests.js";

import logger from "../../logger.js";

export function setupCronJobs(db, clientBot, webBot) {
  try {
    scheduleReminders(webBot);
  } catch (error) {
    logger.error("❌ Failed to scheduleReminders:", error);
  }

  try {
    scheduleCleanupJobs(db);
  } catch (error) {
    logger.error("❌ Failed to scheduleCleanupJobs:", error);
  }

  try {
    schedulePriceUpdates(db, clientBot);
  } catch (error) {
    logger.error("❌ Failed to schedulePriceUpdates:", error);
  }

  try {
    schedulePortfolioSnapshots(db);
  } catch (error) {
    logger.error("❌ Failed to schedulePortfolioSnapshots:", error);
  }

  try {
    scheduleQuestJobs(db, clientBot);
  } catch (error) {
    logger.error("❌ Failed to scheduleQuestJobs:", error);
  }
}
