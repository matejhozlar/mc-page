import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";

export const data = new SlashCommandBuilder()
  .setName("market-alert-remove")
  .setDescription("Remove your market alert for a specific token")
  .addStringOption((option) =>
    option
      .setName("token")
      .setDescription("Token symbol (e.g. RGC)")
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const userId = interaction.user.id;
  const symbol = interaction.options.getString("token").toUpperCase();

  try {
    const { rowCount } = await db.query(
      `DELETE FROM token_price_alerts
       WHERE discord_id = $1 AND token_symbol = $2`,
      [userId, symbol]
    );

    if (rowCount === 0) {
      return await interaction.reply({
        content: `ℹ️ You don’t have an active alert for **${symbol}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    return await interaction.reply({
      content: `✅ Your alert for **${symbol}** has been removed.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`❌ /market-alert-remove failed: ${error}`);
    return await interaction.reply({
      content: "⚠️ Something went wrong while removing your alert.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
