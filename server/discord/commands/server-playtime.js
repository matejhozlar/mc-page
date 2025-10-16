import logger from "../../logger.js";
import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import config from "../../config/index.js";

let lastPlaytimeServerUse = 0;
const COOLDOWN_MS = 10 * 60 * 1000;
const { GOLD } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("server-playtime")
  .setDescription(
    "Show the total combined playtime of all players on the server"
  );

export const prodOnly = true;

export async function execute(interaction, db) {
  const now = Date.now();

  if (now - lastPlaytimeServerUse < COOLDOWN_MS) {
    const remainingMs = COOLDOWN_MS - (now - lastPlaytimeServerUse);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    return await interaction.reply({
      content: `⏳ Please wait ${minutes} minute(s) and ${seconds} second(s) before using this command again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const result = await db.query(
      `SELECT SUM(play_time_seconds) AS total FROM users`
    );
    const totalSeconds = parseInt(result.rows[0].total || 0, 10);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor(totalSeconds / 60);

    const embed = new EmbedBuilder()
      .setTitle("🕓 Total Server Playtime")
      .setDescription(`**${days}d ${hours}h ${minutes}m**`)
      .addFields(
        {
          name: "Seconds",
          value: totalSeconds.toLocaleString(),
          inline: true,
        },
        {
          name: "Minutes",
          value: totalMinutes.toLocaleString(),
          inline: true,
        },
        {
          name: "Hours",
          value: totalHours.toLocaleString(),
          inline: true,
        }
      )
      .setColor(GOLD)
      .setFooter({ text: "All-time playtime of every registered player" });

    lastPlaytimeServerUse = now;

    return await interaction.reply({
      embeds: [embed],
    });
  } catch (error) {
    logger.error("/server-playtime failed:", error);
    return await interaction.reply({
      content: "⚠️ Could not fetch total playtime. Try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
