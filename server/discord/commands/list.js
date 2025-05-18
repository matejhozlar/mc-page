import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

const cooldowns = new Map();

export const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("Show currently online players on the Minecraft server");

export async function execute(interaction, db) {
  const userId = interaction.user.id;
  const now = Date.now();
  const cooldownPeriod = 10 * 60 * 1000;

  const lastUsed = cooldowns.get(userId);
  if (lastUsed && now - lastUsed < cooldownPeriod) {
    const remaining = Math.ceil((cooldownPeriod - (now - lastUsed)) / 60000);
    return await interaction.reply({
      content: `⏳ Please wait ${remaining} more minute(s) before using this again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const result = await db.query(
      `SELECT name FROM users WHERE online = true ORDER BY name ASC`
    );

    const onlinePlayers = result.rows;

    cooldowns.set(userId, now);

    if (onlinePlayers.length === 0) {
      return await interaction.reply({
        content: "🟥 No players are currently online.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const playerList = onlinePlayers.map((p) => `- ${p.name}`).join("\n");

    return await interaction.reply({
      content: `🟩 **${onlinePlayers.length} player(s) online:**\n${playerList}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`❌ Failed to query online players: ${logError(error)}`);
    return await interaction.reply({
      content: "⚠️ Could not fetch player list. Try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
