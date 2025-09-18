import logger from "../../logger.js";
import { exitIfNotProduction } from "../../utils/production/onlyInProduction.js";

const LINK_REGEX = /https?:\/\/[^\s]+/i;

/**
 * Watches a designated channel and deletes messages that do not contain links.
 * Sends a warning message if a non-link message is posted.
 * Only runs in production.
 *
 * @param {import('discord.js').Client} client - The Discord.js client instance.
 */
export default function setupLinkOnlyChannelWatcher(client) {
  if (!exitIfNotProduction()) return;

  const targetChannelId = process.env.DISCORD_MOD_SUGGESTIONS_CHANNEL_ID;
  const modDiscussionChannelId = process.env.DISCORD_MOD_DISCUSSION_CHANNEL_ID;

  client.on("messageCreate", async (message) => {
    if (message.author.bot || message.channel.id !== targetChannelId) return;

    const containsLink = LINK_REGEX.test(message.content);

    if (!containsLink) {
      try {
        await message.delete();

        const warning = await message.channel.send({
          content: `⚠️ <@${message.author.id}>, only messages containing links are allowed in this channel.\nIf you wish to discuss mods, please use <#${modDiscussionChannelId}>.`,
        });

        setTimeout(() => {
          warning.delete().catch(() => {});
        }, 30000);

        logger.info(`Deleted non-link message from ${message.author.tag}`);
      } catch (err) {
        logger.error(`Failed to delete or warn: ${err.message}`);
      }
    }
  });
}
