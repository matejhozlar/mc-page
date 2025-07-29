import logger from "../../logger.js";
import { sendBotNotification } from "../notifiers/sendBotNotification.js";

/**
 * Gracefully shuts down a Discord bot and optionally sends a notification.
 *
 * @param {import('discord.js').Client} client - The bot instance to shut down.
 * @param {Object} options
 * @param {boolean} [options.notify=false] - Whether to send a shutdown notification.
 * @param {string} [options.name='Bot'] - Friendly name for logging.
 * @param {string} [options.message=''] - Message to send if notify is true.
 */
export const shutdownBot = async (
  client,
  { notify = false, name = "Bot", message = "" } = {}
) => {
  logger.info(`Shutting down ${name}...`);
  try {
    if (notify && message) {
      await sendBotNotification(client, message);
    }

    await client.destroy();
    logger.info(`${name} shut down successfully`);
  } catch (error) {
    logger.error(`Error during ${name} shutdown: ${error}`);
  }
};
