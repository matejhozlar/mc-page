import { scheduleReminders } from "./reminders.js";
import { scheduleCleanupJobs } from "./cleanup.js";
import { schedulePriceUpdates } from "./priceUpdates.js";
import { schedulePortfolioSnapshots } from "./portfolio.js";
import { scheduleQuestJobs } from "./quests.js";
import { scheduleMembershipDurationRoleAssignment } from "./roles.js";
import { scheduleCompanyUpdates } from "./companies.js";

import logger from "../../logger.js";

/**
 * Sets up all scheduled (cron) jobs required by the application,
 * such as reminders, cleanups, price updates, and quests.
 *
 * @param {import('pg').Pool} db - PostgreSQL database pool/connection.
 * @param {import('discord.js').Client} clientBot - The main Discord bot client.
 * @param {import('discord.js').Client} webBot - A secondary Discord bot client (used for web interactions or specific events).
 */
export function setupCronJobs(db, clientBot, webBot, io) {
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
    schedulePriceUpdates(db, clientBot, io);
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

  try {
    scheduleMembershipDurationRoleAssignment(db, clientBot);
  } catch (error) {
    logger.error(
      "❌ Failed to scheduleMembershipDurationRoleAssignment:",
      error
    );
  }

  try {
    scheduleCompanyUpdates(db);
  } catch (error) {
    logger.error("❌ Failed to scheduleCompanyUpdates:", error);
  }
}
