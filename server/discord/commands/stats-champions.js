import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

const GLOBAL_COOLDOWN_MS = 60 * 60 * 1000;
let lastGlobalExecution = 0;

export const data = new SlashCommandBuilder()
  .setName("stats-champions")
  .setDescription(
    "Show players with the most 1st-places across all Minecraft stats"
  );

export async function execute(interaction, db) {
  const now = Date.now();

  if (now - lastGlobalExecution < GLOBAL_COOLDOWN_MS) {
    const remainingMs = GLOBAL_COOLDOWN_MS - (now - lastGlobalExecution);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    return await interaction.reply({
      content: `⏳ Please wait ${minutes} minute(s) and ${seconds} second(s) before using this command again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply();

  try {
    const query = `
      SELECT mc_name, COUNT(*) AS first_place_count
      FROM (
        SELECT DISTINCT ON (stat_type, stat_key) 
               u.name AS mc_name,
               ps.value
        FROM player_stats ps
        JOIN users u ON ps.uuid = u.uuid
        ORDER BY stat_type, stat_key, ps.value DESC
      ) first_place_per_stat
      GROUP BY mc_name
      ORDER BY first_place_count DESC
      LIMIT 10;
    `;

    const { rows } = await db.query(query);

    if (rows.length === 0) {
      return await interaction.editReply("❌ No leaderboard data found.");
    }

    const leaderboard = rows
      .map(
        (row, i) => `#${i + 1} **${row.mc_name}** — ${row.first_place_count} 🥇`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 Stat Champions: Most 1st Places")
      .setDescription(leaderboard)
      .setColor(0x9b59b6)
      .setFooter({
        text: "Overall Stat Leaderboard",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    lastGlobalExecution = now;

    await interaction.editReply({ embeds: [embed] });
    logger.info("✅ Successfuly sent /stat-champions");
  } catch (error) {
    logger.error(`❌ /stats-champions command failed: ${logError(error)}`);
    await interaction.editReply("⚠️ Something went wrong. Try again later.");
  }
}
