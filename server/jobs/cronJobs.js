import cron from "node-cron";

import { runMobLimitCleaner } from "../services/mobLimitCleaner.js";
import { cleanupDailyPlaytime } from "../services/dailyPlaytimeCleaner.js";
import { updateRingcoinPriceMinutes } from "../services/crypto/updateRingcoinPriceMinutes.js";
import { updateRingcoinPriceHourly } from "../services/crypto/updateRingcoinPriceHourly.js";
import { updateRingcoinPriceDaily } from "../services/crypto/updateRingcoinPriceDaily.js";
import { updateRingcoinPriceWeekly } from "../services/crypto/updateRingcoinPriceWeekly.js";
import { snapshotUserPortfolios } from "../services/crypto/dailyPortfolioSnapshot.js";
import { cleanupTokenHistoryTable } from "../services/crypto/cleanupTokenHistory.js";
import { deleteCrashedMemecoins } from "../services/crypto/deleteCrashedMemecoins.js";
import { finalizeDailyPlaytime } from "../services/finalizeDailyPlaytime.js";
import { updateQuestProgress } from "../services/updateQuestProgress.js";
import { generateDailyQuestsAndTokenUpdate } from "../services/crypto/generateDailyQuestsAndTokenUpdate.js";

export function setupCronJobs(db, client) {
  // clean up daily playtime and daily mob limit
  cron.schedule(
    `30 6 * * *`,
    () => {
      runMobLimitCleaner(db);
      cleanupDailyPlaytime(db);
    },
    {
      timezone: "Europe/Berlin",
    }
  );
  // Token/Ringcoin updates
  cron.schedule("*/10 * * * *", () => updateRingcoinPriceMinutes(db));
  cron.schedule("1 * * * *", () => updateRingcoinPriceHourly(db), {
    timezone: "Europe/Berlin",
  });
  cron.schedule(
    "20 6 * * *",
    () => {
      updateRingcoinPriceDaily(db, "RGC");
      updateRingcoinPriceDaily(db, "PLC");
    },
    {
      timezone: "Europe/Berlin",
    }
  );
  cron.schedule("30 4 * * 1", () => updateRingcoinPriceWeekly(db), {
    timezone: "Europe/Berlin",
  });
  // user portfolio snapshots
  cron.schedule("0 4 * * *", () => snapshotUserPortfolios(db), {
    timezone: "Europe/Berlin",
  });
  // clean up price histories
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
  // delete crashed memecoins
  cron.schedule("*/30 * * * *", () => deleteCrashedMemecoins(db), {
    timezone: "Europe/Berlin",
  });
  // finalizing daily playtime
  cron.schedule("0 6 * * *", () => finalizeDailyPlaytime(db), {
    timezone: "Europe/Berlin",
  });
  //   cron.schedule(
  //     "0 * * * *",
  //     () => {
  //       updateQuestProgress(db, client, process.env.DISCORD_QUESTS_CHANNEL_ID);
  //     },
  //     {
  //       timezone: "Europe/Berlin",
  //     }
  //   );
  // //  generate daily quests
  //   cron.schedule(
  //     "15 6 * * *",
  //     () =>
  //       generateDailyQuestsAndTokenUpdate(
  //         db,
  //         client,
  //         process.env.DISCORD_QUESTS_CHANNEL_ID
  //       ),
  //     { timezone: "Europe/Berlin" }
  //   );
}
