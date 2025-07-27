import logger from "../../../logger.js";
import { exitIfNotProduction } from "../../../utils/production/onlyInProduction.js";

/**
 * Sends a daily reminder message to the configured Minecraft channel.
 * Only runs in production environment.
 *
 * @param {import('discord.js').Client} client - The Discord.js client instance.
 */
export async function sendDailyReminder(client) {
  if (!exitIfNotProduction()) return;

  const message =
    "💡 Don't forget to do /daily for rewards and complete quests to earn PLC token!";
  const channelId = process.env.DISCORD_MINECRAFT_CHANNEL_ID;
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
      logger.info(`✅ Sent daily reminder to channel ${channelId}`);
    } else {
      logger.warn(
        `⚠️ Channel ${channelId} is not text-based or doesn't exist.`
      );
    }
  } catch (error) {
    logger.error(`❌ Failed to send daily reminder: ${error}`);
  }
}
