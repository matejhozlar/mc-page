import logger from "../../../logger.js";

/**
 * Announces a lottery refund in the Minecraft channel when only one participant joined.
 *
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {string} participantName - The name of the user who entered the lottery.
 * @param {number} amount - The amount refunded to the participant.
 * @returns {Promise<void>}
 */
export async function announceLotteryRefund(client, participantName, amount) {
  const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;
  const message = `❌ **Lottery Canceled**\nOnly one participant (**${participantName}**) joined.\n💸 Entry fee of $${amount.toLocaleString()} has been refunded.`;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
      logger.info(`Sent lottery refund announcement to channel ${channelId}`);
    } else {
      logger.warn(`Channel ${channelId} is not text-based or doesn't exist.`);
    }
  } catch (error) {
    logger.error("Failed to send lottery refund message:", error);
  }
}
