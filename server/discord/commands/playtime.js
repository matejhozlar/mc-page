import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("playtime")
  .setDescription("Check your own or another player's playtime")
  .addStringOption((option) =>
    option
      .setName("mc_name")
      .setDescription("Minecraft username (optional)")
      .setRequired(false)
  );

export async function execute(interaction, db) {
  const requestedName = interaction.options.getString("mc_name");
  const discordId = interaction.user.id;

  try {
    let userData;

    if (requestedName) {
      userData = await db.query(
        `SELECT name, play_time_seconds FROM users WHERE LOWER(name) = LOWER($1)`,
        [requestedName]
      );

      if (userData.rowCount === 0) {
        return await interaction.reply({
          content: `❌ No player found with the name \`${requestedName}\`.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else {
      userData = await db.query(
        `SELECT name, play_time_seconds FROM users WHERE discord_id = $1`,
        [discordId]
      );

      if (userData.rowCount === 0) {
        return await interaction.reply({
          content: `❌ You don’t have your Minecraft account linked yet. Use **/link <username>** to connect your account.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const { play_time_seconds, name } = userData.rows[0] || {};
    if (!play_time_seconds) {
      return await interaction.reply({
        content: `⏳ No playtime recorded yet for **${name}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const hours = Math.floor(play_time_seconds / 3600);
    const minutes = Math.floor((play_time_seconds % 3600) / 60);

    return await interaction.reply({
      content: `🕹️ **${name}** has played for **${hours}h ${minutes}m** in total.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`❌ Failed to fetch playtime: ${logError(error)}`);
    return await interaction.reply({
      content:
        "⚠️ Something went wrong while fetching playtime. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
