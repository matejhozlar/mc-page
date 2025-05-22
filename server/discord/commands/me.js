import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  Message,
} from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

export const data = new SlashCommandBuilder()
  .setName("me")
  .setDescription("View all data about your Minecraft and clicker profile");

export async function execute(interaction, db) {
  const discordId = interaction.user.id;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userRes = await db.query(
      `SELECT * FROM users WHERE discord_id = $1 LIMIT 1`,
      [discordId]
    );
    const clickerRes = await db.query(
      `SELECT * FROM clicker_game_data WHERE discord_id = $1 LIMIT 1`,
      [discordId]
    );

    if (userRes.rowCount === 0) {
      return await interaction.editReply({
        content:
          "❌ No data found. You are not linked to any Minecraft account.",
      });
    }

    const userData = userRes.rows[0];
    const clickerData = clickerRes.rows[0];

    const embed = new EmbedBuilder()
      .setTitle(`📄 Your Profile`)
      .setColor(0x00bfff)
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: "Data stored in the database" });

    embed.addFields({
      name: "🧍 User Info",
      value: Object.entries(userData)
        .map(([key, val]) => `**${key}**: \`${val}\``)
        .join("\n")
        .slice(0, 1024),
    });

    if (clickerData) {
      embed.addFields({
        name: "🎮 Clicker Game",
        value: Object.entries(clickerData)
          .map(([key, val]) => `**${key}**: \`${val}\``)
          .join("\n")
          .slice(0, 1024),
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(`❌ /me command failed: ${logError(error)}`);
    return await interaction.editReply({
      content: "⚠️ Something went wrong. Try again later.",
    });
  }
}
