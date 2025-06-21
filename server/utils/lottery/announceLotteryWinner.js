export async function announceLotteryWinner(client, winnerName, amountWon) {
  const channelId = process.env.DISCORD_MINECRAFT_CHANNEL_ID;
  const message = `🏆 **Lottery Winner**\nWinner: **${winnerName}**\nPrize: **$${amountWon.toLocaleString()}**\nGG! 🎉`;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
      console.log(
        `✅ Sent lottery winner announcement to channel ${channelId}`
      );
    } else {
      console.warn(
        `⚠️ Channel ${channelId} is not text-based or doesn't exist.`
      );
    }
  } catch (error) {
    console.error(`❌ Failed to send lottery winner announcement:`, error);
  }
}
