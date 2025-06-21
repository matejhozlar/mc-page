export async function sendDailyReminder(client) {
  const message =
    "💡 Don't forget to do /daily for rewards and complete quests to earn PLC token!";
  const channelId = process.env.DISCORD_MINECRAFT_CHANNEL_ID;
  try {
    const channel = await client.channels.fetch();
    if (channel && channel.isTextBased()) {
      await channel.send(message);
      console.log(`✅ Sent daily reminder to channel ${channelId}`);
    } else {
      console.warn(
        `⚠️ Channel ${channelId} is not text-based or doesn't exist.`
      );
    }
  } catch (error) {
    console.error(`❌ Failed to send daily reminder:`, error);
  }
}
