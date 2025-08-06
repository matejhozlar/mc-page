import cron from "node-cron";
import { logCompanyBalances } from "../../services/market/companies/logCompanyBalances.js";

export function scheduleCompanyUpdates(db) {
  // Daily at 6:00 AM — Log company balances
  cron.schedule(
    "0 6 * * *",
    () => {
      logCompanyBalances(db);
    },
    {
      timezone: "Europe/Berlin",
    }
  );
}
