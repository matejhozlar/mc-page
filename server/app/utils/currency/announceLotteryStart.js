import logger from "../../../logger.js";
import webBot from "../../../discord/bots/webBot.js";

/**
 * Announces the start of a lottery in the Minecraft Discord channel.
 *
 * @param {import('discord.js').Client} webBot - The Discord bot client used for sending announcements.
 * @param {string} hostName - The name of the user hosting the lottery.
 * @returns {Promise<void>}
 */
export async function announceLotteryStart(hostName) {
  const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;
  const message = `🎲 **Lottery Started**\nHost: **${hostName}**\nType \`/join <amount>\` to participate!\nWinner will be announced in 2 minutes...`;

  try {
    const channel = await webBot.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
      logger.info(`✅ Sent lottery start announcement to channel ${channelId}`);
    } else {
      logger.warn(
        `⚠️ Channel ${channelId} is not text-based or doesn't exist.`
      );
    }
  } catch (error) {
    logger.error(`❌ Failed to send lottery announcement: ${error}`);
  }
}
