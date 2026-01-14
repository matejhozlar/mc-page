import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import dotenv from "dotenv";
import config from "../../config/index.js";
import logger from "../../logger.js";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("username")
  .setDescription("Retrieve user's Minecraft username")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("User to retrieve username for")
      .setRequired(true)
  );

export const prodOnly = false;

export async function execute(interaction, db) {
  const user = interaction.options.getUser("user", true);

  try {
    const result = await db.query(
      `SELECT name FROM users
             WHERE discord_id = $1`,
      [user.id]
    );

    if (!result || result.rows.length === 0) {
      return await interaction.reply({
        content: "User not found in database.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const username = result.rows[0].name;

    const embed = new EmbedBuilder()
      .setTitle(username)
      .setColor(config.uiColors.GOLD);

    await interaction.reply({
      embeds: [embed], // Wrap embed in an array
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("/username failed:", error);
    return await interaction.reply({
      content: "An error occurred while retrieving the username.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
