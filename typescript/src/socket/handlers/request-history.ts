import type { Socket } from "socket.io";
import type { Client, Message, Snowflake, MessageManager } from "discord.js";
import {
  ChannelType,
  type TextChannel,
  type NewsChannel,
  type ThreadChannel,
  type DMChannel,
} from "discord.js";
import logger from "../../logger";

type ChatAuthorType = "discord" | "web" | "minecraft";

export interface ChatHistoryItem {
  text: string;
  image: string | null;
  authorType: ChatAuthorType;
}
/**
 * Fetch the last 100 messages from the configured Minecraft chat channel
 * and emit them to the client via Socket.IO.
 */
export default async function requestHistoryHandler(
  socket: Socket,
  webBot: Client
): Promise<void> {
  try {
    const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID as
      | Snowflake
      | undefined;
    if (!channelId) {
      logger.error("DISCORD_MINECRAFT_CHAT_CHANNEL_ID is not set.");
      return;
    }

    const channel = await webBot.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      logger.error("Channel not found or is not text-based.");
      return;
    }

    let messagesMgr: MessageManager | null = null;

    switch (channel.type) {
      case ChannelType.GuildText:
      case ChannelType.GuildAnnouncement:
        messagesMgr = (channel as TextChannel | NewsChannel).messages;
        break;
      case ChannelType.PublicThread:
      case ChannelType.PrivateThread:
      case ChannelType.AnnouncementThread:
        messagesMgr = (channel as ThreadChannel).messages;
        break;
      case ChannelType.DM:
        messagesMgr = (channel as DMChannel).messages;
        break;
      default:
        messagesMgr = null;
    }

    if (!messagesMgr) {
      logger.error("Channel does not support message fetching.");
      return;
    }

    const messages = await messagesMgr.fetch({ limit: 100 });
    const webBotId = webBot.user?.id;

    const filtered: ChatHistoryItem[] = [...messages.values()]
      .reverse()
      .filter((msg) => {
        if (!msg.author.bot) return true;
        if (webBotId && msg.author.id === webBotId) return true;
        return /^`<[^<>]+>`/.test(msg.content);
      })
      .map((msg) => {
        const isWebBot = webBotId ? msg.author.id === webBotId : false;
        const name = msg.member?.displayName || msg.author.username;
        const image = msg.attachments.first()?.url ?? null;

        let authorType: ChatAuthorType = "discord";
        if (isWebBot) authorType = "web";
        else if (/^`<[^<>]+>`/.test(msg.content)) authorType = "minecraft";

        const text =
          isWebBot || authorType === "minecraft"
            ? msg.content
            : `[${name}]: ${msg.content}`;

        return { text, image, authorType };
      });

    logger.info(`Sending ${filtered.length} messages to client`);
    socket.emit("chatHistory", filtered);
  } catch (error) {
    logger.error("Failed to fetch chat history:", error);
  }
}
