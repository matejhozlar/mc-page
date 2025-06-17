import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import dotenv from "dotenv";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const OWNER_ROLE_ID = process.env.DISCORD_OWNER_ROLE_ID;

const adminCooldowns = new Map();

export const data = new SlashCommandBuilder()
  .setName("delete")
  .setDescription("Delete up to 100 recent messages (admin/owner only)")
  .addIntegerOption((option) =>
    option
      .setName("count")
      .setDescription("Number of messages to delete (max 100)")
      .setRequired(true)
  );

export async function execute(interaction) {
  const member = interaction.member;
  const userId = interaction.user.id;
  const count = interaction.options.getInteger("count");

  const hasAdminRole = member.roles.cache.has(ADMIN_ROLE_ID);
  const hasOwnerRole = member.roles.cache.has(OWNER_ROLE_ID);

  if (!hasAdminRole && !hasOwnerRole) {
    return await interaction.reply({
      content: "❌ You do not have permission to use this command.",
      ephemeral: true,
    });
  }

  if (hasAdminRole && !hasOwnerRole) {
    const lastUsed = adminCooldowns.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < 10 * 60 * 1000) {
      const remaining = Math.ceil((10 * 60 * 1000 - (now - lastUsed)) / 1000);
      return await interaction.reply({
        content: `⏳ Please wait ${remaining} seconds before using this again.`,
        ephemeral: true,
      });
    }

    adminCooldowns.set(userId, now);
  }

  if (count < 1 || count > 100) {
    return await interaction.reply({
      content: "⚠️ Please provide a number between 1 and 100.",
      ephemeral: true,
    });
  }

  try {
    const deletedMessages = await interaction.channel.bulkDelete(count, true);
    await interaction.reply({
      content: `✅ Deleted ${deletedMessages.size} messages.`,
      ephemeral: true,
    });
  } catch (error) {
    logger.error(`❌ /delete failed: ${logError(error)}`);
    await interaction.reply({
      content:
        "⚠️ Failed to delete messages. Make sure they are not older than 14 days.",
      ephemeral: true,
    });
  }
}
