import logger from "../../../logger.js";

/**
 * Announces the start of a lottery in the Minecraft Discord channel.
 *
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {string} hostName - The name of the user hosting the lottery.
 * @returns {Promise<void>}
 */
export async function announceLotteryStart(client, hostName) {
  const channelId = process.env.DISCORD_MINECRAFT_CHANNEL_ID;
  const message = `🎲 **Lottery Started**\nHost: **${hostName}**\nType \`/join <amount>\` to participate!\nWinner will be announced in 2 minutes...`;

  try {
    const channel = await client.channels.fetch(channelId);
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
