import cron from "node-cron";
import { updateRingcoinPriceMinutes } from "../../services/crypto/updates/updateRingcoinPriceMinutes.js";
import { updateRingcoinPriceHourly } from "../../services/crypto/updates/updateRingcoinPriceHourly.js";
import { updateRingcoinPriceDaily } from "../../services/crypto/updates/updateRingcoinPriceDaily.js";
import { updateRingcoinPriceWeekly } from "../../services/crypto/updates/updateRingcoinPriceWeekly.js";
import { updateMemecoinPrices } from "../../services/crypto/memecoins/updateMemecoinPrices.js";

export function schedulePriceUpdates(db, clientBot) {
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

  cron.schedule("*/30 * * * * *", () => updateMemecoinPrices(db, clientBot));
}
