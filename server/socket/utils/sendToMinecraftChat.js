import logger from "../../logger.js";

const MINECRAFT_CHANNEL_NAME = "minecraft-chat";

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
    const channel = guild.channels.cache.find(
      (ch) => ch.name === MINECRAFT_CHANNEL_NAME
    );

    if (channel?.isTextBased()) {
      await channel.send(message);
    }
  } catch (err) {
    logger.error(`❌ Failed to send message to Minecraft chat: ${err}`);
  }
}
