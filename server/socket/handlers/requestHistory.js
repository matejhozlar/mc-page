import logger from "../../logger.js";
import { Client, TextChannel } from "discord.js";
import { Socket } from "socket.io";

/**
 * Fetches the last 100 messages from the configured Minecraft chat Discord channel
 * and sends them to the connected client via Socket.IO.
 *
 * Filters:
 * - All non-bot messages
 * - Messages from the web bot
 * - Bot messages matching Minecraft-style format: `<Username>`
 *
 * @param {Socket} socket - Socket.IO connection instance.
 * @param {Client} webBot - Discord.js client instance (the web chat bot).
 * @returns {Promise<void>}
 */
export default async function requestHistoryHandler(socket, webBot) {
  try {
    const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;

    const channel = /** @type {TextChannel | null} */ (
      await webBot.channels.fetch(channelId)
    );

    if (!channel?.isTextBased?.()) {
      logger.error("❌ Channel not found or is not text-based.");
      return;
    }

    const messages = await channel.messages.fetch({ limit: 100 });
    const webBotId = webBot.user?.id;

    const filtered = [...messages.values()]
      .reverse()
      .filter((msg) => {
        if (!msg.author.bot) return true;
        if (msg.author.id === webBotId) return true;
        return msg.content.match(/^`<[^<>]+>`/);
      })
      .map((msg) => {
        const isWebBot = msg.author.id === webBotId;
        const name = msg.member?.displayName || msg.author.username;
        const image = msg.attachments.first()?.url || null;

        let authorType = "discord";
        if (isWebBot) authorType = "web";
        else if (msg.content.match(/^`<[^<>]+>`/)) authorType = "minecraft";

        const text =
          isWebBot || authorType === "minecraft"
            ? msg.content
            : `[${name}]: ${msg.content}`;

        return { text, image, authorType };
      });

    logger.info(`📨 Sending ${filtered.length} messages to client`);
    socket.emit("chatHistory", filtered);
  } catch (err) {
    logger.error(`❌ Failed to fetch chat history: ${err}`);
  }
}
