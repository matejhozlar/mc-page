import cron from "node-cron";
import { logCompanyBalances } from "../../services/market/companies/logCompanyBalances.js";
import { updateServerCompanyBalance } from "../../services/market/companies/updateServerCompanyBalance.js";
import { accrueCompanyInterest } from "../../services/market/companies/accrueCompanyInterest.js";

export function scheduleCompanyUpdates(db) {
  // Daily at 6:00 AM — Log company balances
  cron.schedule("0 6 * * *", () => logCompanyBalances(db), {
    timezone: "Europe/Berlin",
  });

  // Every 30 mins — Update server company (ID 1000)
  cron.schedule("*/30 * * * *", () => updateServerCompanyBalance(db), {
    timezone: "Europe/Berlin",
  });

  // Every hour — Give interest rate to companies
  cron.schedule("0 * * * *", () => accrueCompanyInterest(db), {
    timezone: "Europe/Berlin",
  });
}
