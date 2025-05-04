import { SlashCommandBuilder } from "discord.js";
import logger from "../../logger.js";

let lastTopPlaytimeUse = 0;
const COOLDOWN_MS = 10 * 60 * 1000;

export const data = new SlashCommandBuilder()
  .setName("top-playtime")
  .setDescription("Check the top 10 most active players");

export async function execute(interaction, db) {
  const now = Date.now();
  const remaining = COOLDOWN_MS - (now - lastTopPlaytimeUse);

  if (remaining > 0) {
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return await interaction.reply({
      content: `⏳ Please wait **${mins}m ${secs}s** before using this command again.`,
      ephemeral: true,
    });
  }

  lastTopPlaytimeUse = now;

  try {
    const topPlayers = await db.query(
      `SELECT name, play_time_seconds
       FROM users
       WHERE play_time_seconds IS NOT NULL
       ORDER BY play_time_seconds DESC
       LIMIT 10`
    );

    if (topPlayers.rowCount === 0) {
      return await interaction.reply({
        content: "📉 No playtime data found yet!",
        ephemeral: true,
      });
    }

    const formattedList = topPlayers.rows
      .map((player, index) => {
        const hours = Math.floor(player.play_time_seconds / 3600);
        const minutes = Math.floor((player.play_time_seconds % 3600) / 60);
        return `**#${index + 1}** – \`${
          player.name
        }\` • 🕒 ${hours}h ${minutes}m`;
      })
      .join("\n");

    return await interaction.reply({
      content: `🏆 **Top 10 Most Active Players**\n\n${formattedList}`,
      ephemeral: false,
    });
  } catch (err) {
    logger.error("❌ Failed to fetch leaderboard:", err);
    return await interaction.reply({
      content: "⚠️ Couldn’t load leaderboard. Try again later.",
      ephemeral: true,
    });
  }
}
