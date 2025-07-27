import cron from "node-cron";
import { snapshotUserPortfolios } from "../../services/crypto/snapshots/dailyPortfolioSnapshot.js";

export function schedulePortfolioSnapshots(db) {
  cron.schedule("0 4 * * *", () => snapshotUserPortfolios(db), {
    timezone: "Europe/Berlin",
  });
}
