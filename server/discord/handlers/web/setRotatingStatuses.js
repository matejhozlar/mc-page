import { ActivityType } from "discord.js";
import logger from "../../../logger.js";

/**
 * Sets up rotating presence statuses on a Discord bot client.
 * @param {import("discord.js").Client} client - The bot client
 * @param {string[]} statuses - List of status strings to rotate
 * @param {number} intervalMs - Interval in milliseconds
 */
export default function setRotatingStatuses(
  client,
  statuses,
  intervalMs = 60000
) {
  if (process.env.NODE_ENV === "development") {
    logger.info("🛑 Skipping registering rotating statuses in development");
    return;
  }

  if (!Array.isArray(statuses) || statuses.length === 0) {
    logger.warn("⚠️ No rotating statuses provided for setRotatingStatuses");
    return;
  }

  let index = 0;

  setInterval(() => {
    const status = statuses[index++ % statuses.length];

    client.user.setPresence({
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
