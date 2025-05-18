import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

const userCooldowns = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;

export const data = new SlashCommandBuilder()
  .setName("stats-category")
  .setDescription("Show the top players for a given Minecraft stat category")
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("The stat category (e.g., mined, killed, crafted)")
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const userId = interaction.user.id;
  const now = Date.now();
  const lastUsed = userCooldowns.get(userId) || 0;

  if (now - lastUsed < COOLDOWN_MS) {
    const remainingMs = COOLDOWN_MS - (now - lastUsed);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    return await interaction.reply({
      content: `⏳ You can use this command again in ${minutes} minute(s) and ${seconds} second(s).`,
      flags: MessageFlags.Ephemeral,
    });
  }

  userCooldowns.set(userId, now);

  const rawType = interaction.options
    .getString("type")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const stat_type = `minecraft:${rawType.replace(/^minecraft:/, "")}`;

  await interaction.deferReply();

  try {
    const query = `
      SELECT u.name AS mc_name, SUM(ps.value) AS total
      FROM player_stats ps
      JOIN users u ON ps.uuid = u.uuid
      WHERE ps.stat_type = $1
      GROUP BY u.name
      ORDER BY total DESC
      LIMIT 10;
    `;

    const { rows } = await db.query(query, [stat_type]);

    if (rows.length === 0) {
      return await interaction.editReply(
        `❌ No data found for category \`${stat_type}\`.`
      );
    }

    const displayType = stat_type.split(":").pop().replace(/_/g, " ");
    const capitalizedType =
      displayType.charAt(0).toUpperCase() + displayType.slice(1);

    const medals = ["🥇", "🥈", "🥉"];
    const leaderboard = rows
      .map(
        (row, i) =>
          `${medals[i] || `#${i + 1}`} **${row.mc_name}** — ${Number(
            row.total
          ).toLocaleString()}`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`📊 Top Players: ${capitalizedType}`)
      .setDescription(leaderboard)
      .setColor(0x2ecc71)
      .setFooter({
        text: "Stat Category Leaderboard",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(`❌ /stats-category command failed: ${logError(error)}`);
    await interaction.editReply("⚠️ Something went wrong. Try again later.");
  }
}
