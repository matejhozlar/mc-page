import cron from "node-cron";
import { assignMembershipDurationRoles } from "../../services/roles/assignJoinedRoles.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

/**
 * Schedule the cron job to run daily at 00:15 Berlin time
 * @param {import('pg').Pool} db
 * @param {Client} discordClient
 */
export function scheduleMembershipDurationRoleAssignment(db, clientBot) {
  runOnlyInProduction(() => {
    cron.schedule(
      "15 0 * * *",
      () => {
        assignMembershipDurationRoles(db, clientBot);
      },
      {
        timezone: "Europe/Berlin",
      }
    );
  });
}
