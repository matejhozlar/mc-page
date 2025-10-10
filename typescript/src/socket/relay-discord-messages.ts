import type { Client, Snowflake } from "discord.js";
import type { Server as SocketIOServer } from "socket.io";

/**
 * Relays Discord messages from a specific channel to connected Socket.IO clients.
 * Filters out messages from the web bot and sends others to the frontend.
 */
export default function relayDiscordMessages(
  client: Client,
  webBot: Client,
  io: SocketIOServer
): void {
  const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID as
    | Snowflake
    | undefined;
  if (!channelId) {
    return;
  }

  client.on("messageCreate", (message) => {
    if (
      message.channelId !== channelId ||
      message.author.id === webBot.user?.id
    ) {
      return;
    }

    const displayName = message.member?.displayName || message.author.username;
    const text = `[${displayName}]: ${message.content}`;
    const image = message.attachments.first()?.url ?? null;

    io.emit("chatMessage", { text, image });
  });
}
