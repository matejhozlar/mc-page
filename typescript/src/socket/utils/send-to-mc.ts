import type { Client, GuildBasedChannel } from "discord.js";
import logger from "../../logger";

function hasSend(
  x: unknown
): x is { send: (content: string) => Promise<unknown> } {
  return !!x && typeof (x as any).send === "function";
}
/**
 * Sends a message to the configured Minecraft Discord chat channel.
 *
 * @param {string} message - The message text to send.
 * @param {import("discord.js").Client} webBot - The Discord client instance used to send the message.
 * @returns {Promise<void>}
 */
export async function sendToMinecraftChat(
  message: string,
  webBot: Client
): Promise<void> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;
  if (!guildId || !channelId) {
    logger.warn(
      "Missing DISCORD_GUILD_ID or DISCORD_MINECRAFT_CHAT_CHANNEL_ID."
    );
    return;
  }

  try {
    const guild = await webBot.guilds.fetch(guildId);
    const ch: GuildBasedChannel | null =
      guild.channels.cache.get(channelId) ??
      (await guild.channels.fetch(channelId).catch(() => null));

    if (ch && ch.isTextBased() && hasSend(ch)) {
      await ch.send(message);
      return;
    }

    logger.warn("Channel not found or is not text-sendable.");
  } catch (error) {
    logger.error("Failed to send message to Minecraft chat:", error);
  }
}

export default sendToMinecraftChat;
