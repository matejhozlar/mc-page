/**
 * Relays Discord messages from a specific channel to connected Socket.IO clients.
 * Filters out messages from the web bot and sends others to the frontend.
 *
 * @param {import("discord.js").Client} client - Discord client instance (main bot).
 * @param {import("discord.js").Client} webBot - Web Discord bot instance used to post messages.
 * @param {import("socket.io").Server} io - Initialized Socket.IO server to emit messages to clients.
 */
export default function relayDiscordMessages(client, webBot, io) {
  const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;

  client.on("messageCreate", (message) => {
    if (
      message.channelId !== channelId ||
      message.author.id === webBot.user?.id
    ) {
      return;
    }

    const displayName = message.member?.displayName || message.author.username;
    const text = `[${displayName}]: ${message.content}`;
    const image = message.attachments.first()?.url || null;

    io.emit("chatMessage", { text, image });
  });
}
