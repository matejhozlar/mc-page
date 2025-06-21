import logger from "../../logger.js";
import logError from "../../utils/logError.js";

export async function sendDailyReminder(client) {
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
    logger.error(`❌ Failed to send daily reminder: ${logError(error)}`);
  }
}
