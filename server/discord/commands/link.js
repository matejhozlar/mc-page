import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("link")
  .setDescription("Link your Minecraft name to your Discord account")
  .addStringOption((option) =>
    option
      .setName("mc_name")
      .setDescription("Your Minecraft username")
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const mcName = interaction.options.getString("mc_name");
  const discordId = interaction.user.id;

  try {
    const existing = await db.query(
      `SELECT name FROM users WHERE discord_id = $1`,
      [discordId]
    );

    if (existing.rowCount > 0) {
      return await interaction.reply({
        content: `❌ You’ve already linked your Discord account to \`${existing.rows[0].name}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const result = await db.query(
      `UPDATE users SET discord_id = $1 WHERE name = $2 AND discord_id IS NULL RETURNING *`,
      [discordId, mcName]
    );

    if (result.rowCount === 0) {
      await interaction.reply({
        content: "❌ That Minecraft name was not found or is already linked.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `✅ Successfully linked \`${mcName}\` to your Discord account.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    logger.error(`❌ Failed to link account: ${logError(error)}`);
    await interaction.reply({
      content: "⚠️ Something went wrong while linking. Try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
