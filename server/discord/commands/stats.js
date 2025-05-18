import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

const channelCooldowns = new Map();
const COOLDOWN_MS = 60 * 60 * 1000;
const SPAM_CHANNEL_ID = process.env.DISCORD_BOT_SPAM_CHANNEL_ID;

export const data = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Show the top 5 players for a specific Minecraft stat")
  .addStringOption((option) =>
    option
      .setName("stat_type")
      .setDescription("The stat category (e.g., mined, killed, crafted)")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("stat_key")
      .setDescription(
        "The specific Minecraft stat key (e.g., minecraft:stone or create:mechanical_pump)"
      )
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const channelId = interaction.channel.id;
  const userId = interaction.user.id;

  if (channelId !== SPAM_CHANNEL_ID) {
    const key = `${channelId}:${userId}`;
    const now = Date.now();
    const lastUsed = channelCooldowns.get(key) || 0;

    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = ((COOLDOWN_MS - (now - lastUsed)) / 60000).toFixed(1);
      return await interaction.reply({
        content: `⏳ Please wait ${remaining} more minute(s) before using this command here.\nTry it in <#${SPAM_CHANNEL_ID}> for unlimited access.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    channelCooldowns.set(key, now);
  }

  const statTypeRaw = interaction.options
    .getString("stat_type")
    .trim()
    .toLowerCase();
  const statKeyRaw = interaction.options
    .getString("stat_key")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const stat_type = `minecraft:${statTypeRaw.replace(/^minecraft:/, "")}`;
  const stat_key = statKeyRaw.includes(":")
    ? statKeyRaw
    : `minecraft:${statKeyRaw}`;

  await interaction.deferReply();

  try {
    const query = `
      SELECT u.name AS mc_name, ps.value
      FROM player_stats ps
      JOIN users u ON ps.uuid = u.uuid
      WHERE ps.stat_type = $1 AND ps.stat_key = $2
      ORDER BY ps.value DESC
      LIMIT 5;
    `;

    const { rows } = await db.query(query, [stat_type, stat_key]);

    if (rows.length === 0) {
      return await interaction.editReply(
        `❌ No data found for \`${stat_type}.${stat_key}\`.`
      );
    }

    const prettyKey = stat_key.split(":").pop().replace(/_/g, " ");
    const capitalizedKey =
      prettyKey.charAt(0).toUpperCase() + prettyKey.slice(1);
    const prettyType = stat_type.split(":").pop().replace(/_/g, " ");
    const capitalizedType =
      prettyType.charAt(0).toUpperCase() + prettyType.slice(1);
    const displayTitle = `${capitalizedType} ${capitalizedKey}`;

    const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];
    const leaderboard = rows
      .map(
        (row, i) =>
          `${medals[i] || ""} **${
            row.mc_name
          }** — ${row.value.toLocaleString()}`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Top 5 for: ${displayTitle}`)
      .setDescription(leaderboard)
      .setColor(0xf1c40f)
      .setFooter({
        text: "Stat Leaderboard",
        iconURL: interaction.client.user.displayAvatarURL(),
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(`❌ /stats command failed: ${logError(error)}`);
    await interaction.editReply("⚠️ Something went wrong. Try again later.");
  }
}
