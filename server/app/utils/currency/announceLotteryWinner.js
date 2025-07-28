import logger from "../../../logger.js";

/**
 * Announces the winner of the lottery in the Minecraft Discord channel.
 *
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {string} winnerName - The name of the lottery winner.
 * @param {number} amountWon - The amount of money the winner received.
 * @returns {Promise<void>}
 */
export async function announceLotteryWinner(client, winnerName, amountWon) {
  const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;
  const message = `🏆 **Lottery Winner**\nWinner: **${winnerName}**\nPrize: **$${amountWon.toLocaleString()}**\nGG! 🎉`;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
      logger.log(`✅ Sent lottery winner announcement to channel ${channelId}`);
    } else {
      logger.warn(
        `⚠️ Channel ${channelId} is not text-based or doesn't exist.`
      );
    }
  } catch (error) {
    logger.error(`❌ Failed to send lottery winner announcement: ${error}`);
  }
}
