import logger from "../../logger.js";

/**
 * Sends a message to the configured Minecraft Discord chat channel.
 *
 * @param {string} message - The message text to send.
 * @param {import("discord.js").Client} webBot - The Discord client instance used to send the message.
 * @returns {Promise<void>}
 */
export async function sendToMinecraftChat(message, webBot) {
  try {
    const guild = await webBot.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const channel = guild.channels.cache.get(
      process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID
    );

    if (channel?.isTextBased()) {
      await channel.send(message);
    } else {
      logger.warn("Channel not found or is not text-based.");
    }
  } catch (err) {
    logger.error(`Failed to send message to Minecraft chat: ${err}`);
  }
}
