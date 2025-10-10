import { ActivityType, type Client } from "discord.js";
import logger from "../../../logger";
import { exitIfNotProduction } from "../../../utils/production/env-guard";

/**
 * Sets up rotating presence statuses on a Discord bot client.
 */
export default function setRotatingStatuses(
  client: Client,
  statuses: string[],
  intervalMs = 60_000
): void {
  if (!exitIfNotProduction()) return;

  if (!Array.isArray(statuses) || statuses.length === 0) {
    logger.warn("No rotating statuses provided for setRotatingStatuses");
    return;
  }

  if (!client.user) {
    logger.warn("Discord client not ready; cannot set presence yet.");
    return;
  }

  let index = 0;

  setInterval(() => {
    const status = statuses[index++ % statuses.length];

    client.user!.setPresence({
      activities: [
        {
          type: ActivityType.Custom,
          name: "custom",
          state: status,
        },
      ],
      status: "online",
      afk: false,
    });
  }, intervalMs);
}
