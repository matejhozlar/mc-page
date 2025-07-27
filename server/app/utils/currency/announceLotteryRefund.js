import logger from "../../../logger.js";

export async function announceLotteryRefund(client, participantName, amount) {
  const channelId = process.env.DISCORD_MINECRAFT_CHANNEL_ID;
  const message = `❌ **Lottery Canceled**\nOnly one participant (**${participantName}**) joined.\n💸 Entry fee of $${amount.toLocaleString()} has been refunded.`;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
      logger.info(
        `✅ Sent lottery refund announcement to channel ${channelId}`
      );
    } else {
      logger.warn(
        `⚠️ Channel ${channelId} is not text-based or doesn't exist.`
      );
    }
  } catch (error) {
    logger.error(`❌ Failed to send lottery refund message: ${error}`);
  }
}
