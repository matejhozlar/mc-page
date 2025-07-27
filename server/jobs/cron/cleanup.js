import cron from "node-cron";
import { runMobLimitCleaner } from "../../services/daily/mobLimitCleaner.js";
import { cleanupDailyPlaytime } from "../../services/daily/dailyPlaytimeCleaner.js";
import { finalizeDailyPlaytime } from "../../services/daily/finalizeDailyPlaytime.js";
import { cleanupTokenHistoryTable } from "../../services/crypto/cleanup/cleanupTokenHistory.js";
import { deleteCrashedMemecoins } from "../../services/crypto/memecoins/deleteCrashedMemecoins.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

export function scheduleCleanupJobs(db) {
  cron.schedule(
    "30 6 * * *",
    () => {
      runMobLimitCleaner(db);
      cleanupDailyPlaytime(db);
    },
    { timezone: "Europe/Berlin" }
  );

  cron.schedule("0 */3 * * *", () =>
    cleanupTokenHistoryTable(db, "token_price_history_minutes", 144, 20)
  );

  cron.schedule("0 1 * * *", () =>
    cleanupTokenHistoryTable(db, "token_price_history_hourly", 168, 20)
  );

  cron.schedule("0 3 1,15 * *", () =>
    cleanupTokenHistoryTable(db, "token_price_history_daily", 90, 10)
  );

  cron.schedule("0 5 1 * *", () =>
    cleanupTokenHistoryTable(db, "token_price_history_weekly", 104, 5)
  );

  cron.schedule("*/30 * * * *", () => deleteCrashedMemecoins(db), {
    timezone: "Europe/Berlin",
  });

  runOnlyInProduction(() => {
    cron.schedule("0 6 * * *", () => finalizeDailyPlaytime(db), {
      timezone: "Europe/Berlin",
    });
  });
}
