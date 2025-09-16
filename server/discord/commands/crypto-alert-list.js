import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";

export const data = new SlashCommandBuilder()
  .setName("crypto-alert-list")
  .setDescription("View your active crypto price alerts");

export const prodOnly = true;

export async function execute(interaction, db) {
  const userId = interaction.user.id;

  try {
    const { rows: alerts } = await db.query(
      `SELECT token_symbol, target_price
       FROM token_price_alerts
       WHERE discord_id = $1
       ORDER BY token_symbol`,
      [userId]
    );

    if (alerts.length === 0) {
      return await interaction.reply({
        content: `ℹ️ You don’t have any active alerts.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const alertList = alerts
      .map((a) => `• **${a.token_symbol}** at **$${a.target_price}**`)
      .join("\n");

    return await interaction.reply({
      content: `🔔 Your active alerts:\n\n${alertList}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`/crypto-alert-list failed: ${error}`);
    return await interaction.reply({
      content: "⚠️ Failed to fetch your alerts. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
