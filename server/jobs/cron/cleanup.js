import cron from "node-cron";
import { runMobLimitCleaner } from "../../services/daily/mobLimitCleaner.js";
import { cleanupDailyPlaytime } from "../../services/daily/dailyPlaytimeCleaner.js";
import { finalizeDailyPlaytime } from "../../services/daily/finalizeDailyPlaytime.js";
import { cleanupTokenHistoryTable } from "../../services/crypto/cleanup/cleanupTokenHistory.js";
import { deleteCrashedMemecoins } from "../../services/crypto/memecoins/deleteCrashedMemecoins.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

/**
 * Schedules all cleanup and maintenance cron jobs for the application.
 *
 * @param {import("pg").Pool} db - PostgreSQL database pool instance
 */
export function scheduleCleanupJobs(db) {
  // Daily at 06:30 — Clean mob limits and reset daily playtime data
  cron.schedule(
    "30 6 * * *",
    () => {
      runMobLimitCleaner(db);
      cleanupDailyPlaytime(db);
    },
    { timezone: "Europe/Berlin" }
  );

  // Every 3 hours — Clean up old minute-level token price history (keep recent 144, delete in batches of 20)
  cron.schedule("0 */3 * * *", () =>
    cleanupTokenHistoryTable(db, "token_price_history_minutes", 144, 20)
  );

  // Daily at 01:00 — Clean up old hourly token price history (keep recent 168, delete in batches of 20)
  cron.schedule("0 1 * * *", () =>
    cleanupTokenHistoryTable(db, "token_price_history_hourly", 168, 20)
  );

  // On the 1st and 15th of each month at 03:00 — Clean up old daily price history (keep 90, delete 10 at a time)
  cron.schedule("0 3 1,15 * *", () =>
    cleanupTokenHistoryTable(db, "token_price_history_daily", 90, 10)
  );

  // On the 1st of each month at 05:00 — Clean up weekly price history (keep 104 weeks, delete 5 at a time)
  cron.schedule("0 5 1 * *", () =>
    cleanupTokenHistoryTable(db, "token_price_history_weekly", 104, 5)
  );

  // Every 30 minutes — Delete memecoins that have crashed or expired
  cron.schedule("*/30 * * * *", () => deleteCrashedMemecoins(db), {
    timezone: "Europe/Berlin",
  });

  // Daily at 06:00 — Finalize daily playtime snapshot (production only)
  runOnlyInProduction(() => {
    cron.schedule("0 6 * * *", () => finalizeDailyPlaytime(db), {
      timezone: "Europe/Berlin",
    });
  });
}
