import cron from "node-cron";
import { snapshotUserPortfolios } from "../../services/crypto/snapshots/dailyPortfolioSnapshot.js";

/**
 * Schedules daily portfolio snapshot job for all users.
 *
 * @param {import("pg").Pool} db - PostgreSQL database pool instance
 */
export function schedulePortfolioSnapshots(db) {
  // Daily at 04:00 — Take a snapshot of each user's token portfolio
  cron.schedule("0 4 * * *", () => snapshotUserPortfolios(db), {
    timezone: "Europe/Berlin",
  });
}
