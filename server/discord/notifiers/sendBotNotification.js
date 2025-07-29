import logger from "../../logger.js";

/**
 * Sends a notification message to a specific Discord channel using a bot client.
 *
 * @param {import('discord.js').Client} client - The Discord bot client instance.
 * @param {string} message - The message content to send to the channel.
 *
 * @returns {Promise<void>}
 */
export const sendBotNotification = async (client, message) => {
  if (process.env.NODE_ENV !== "production") return;
  const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
    }
  } catch (error) {
    logger.error(`❌ Failed to send bot notification: ${error}`);
  }
};
