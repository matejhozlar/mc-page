import cron from "node-cron";
import { updateStableCoinPrice } from "../../services/crypto/stablecoins/updateStableCoinPrice.js";
import { updateMemecoinPrices } from "../../services/crypto/memecoins/updateMemecoinPrices.js";

/**
 * Schedules periodic price updates for stablecoins.
 *
 * @param {import("pg").Pool} db - PostgreSQL connection pool instance.
 */
export function schedulePriceUpdates(db, clientBot, io) {
  // Every 30 seconds — Memecoin price update
  cron.schedule("*/30 * * * * *", () => {
    updateMemecoinPrices(db, clientBot, io);
  });

  // Every 10 minutes — Minutes Snapshot
  cron.schedule("*/10 * * * *", () => {
    updateStableCoinPrice(db, "minutes", "RGC");
  });

  // Every hour at minute 1 — Hourly Snapshot
  cron.schedule(
    "1 * * * *",
    () => {
      updateStableCoinPrice(db, "hourly", "RGC");
    },
    {
      timezone: "Europe/Berlin",
    }
  );

  // Every day at 06:20 — Daily Snapshot
  cron.schedule(
    "20 6 * * *",
    () => {
      updateStableCoinPrice(db, "daily", "RGC");
      updateStableCoinPrice(db, "daily", "PLC");
    },
    {
      timezone: "Europe/Berlin",
    }
  );

  // Every Monday at 04:30 — Weekly Snapshot
  cron.schedule(
    "30 4 * * 1",
    () => {
      updateStableCoinPrice(db, "weekly", "RGC");
      updateStableCoinPrice(db, "weekly", "PLC");
    },
    {
      timezone: "Europe/Berlin",
    }
  );
}
