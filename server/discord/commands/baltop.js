import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import dotenv from "dotenv";
import config from "../../config/index.js";

dotenv.config();

let lastBalTopUse = 0;
const COOLDOWN_MS = 10 * 60 * 1000;
const { GOLD } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("baltop")
  .setDescription("Show top 10 richest players");

export const prodOnly = true;

export async function execute(interaction, db) {
  const now = Date.now();
  const remaining = COOLDOWN_MS - (now - lastBalTopUse);

  if (remaining > 0) {
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return await interaction.reply({
      content: `⏳ Please wait ${minutes} minute(s) and ${seconds} second(s) before using this command again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  lastBalTopUse = now;

  try {
    const result = await db.query(
      `SELECT name, balance FROM user_funds ORDER BY balance DESC LIMIT 10`
    );

    if (result.rowCount === 0) {
      return await interaction.reply({
        content: "❌ No balances found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const leaderboard = result.rows
      .map((row, index) => {
        const raw = row.balance;
        const num = typeof raw === "string" ? parseFloat(raw) : raw;
        const floored = Math.floor(num);

        const formattedBalance = floored.toLocaleString("en-US");
        return `**#${index + 1}** ${row.name} — $${formattedBalance}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 Balance Top 10")
      .setDescription(leaderboard)
      .setColor(GOLD);

    return await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error("/baltop command failed:", error);
    return await interaction.reply({
      content: "⚠️ Something went wrong while fetching top balances.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
