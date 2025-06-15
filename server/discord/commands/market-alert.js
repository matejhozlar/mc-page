import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

export const data = new SlashCommandBuilder()
  .setName("market-alert")
  .setDescription("Get notified when a token reaches a certain price")
  .addStringOption((option) =>
    option
      .setName("token")
      .setDescription("Token symbol (e.g. RGC)")
      .setRequired(true)
  )
  .addNumberOption((option) =>
    option
      .setName("price")
      .setDescription("Target price (e.g. 0.25)")
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const userId = interaction.user.id;
  const symbol = interaction.options.getString("token").toUpperCase();
  const targetPrice = interaction.options.getNumber("price");

  try {
    const { rows } = await db.query(
      `SELECT 1 FROM crypto_tokens WHERE symbol = $1 LIMIT 1`,
      [symbol]
    );

    if (!rows.length) {
      return await interaction.reply({
        content: `❌ Token \`${symbol}\` not found.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await db.query(
      `INSERT INTO token_price_alerts (discord_id, token_symbol, target_price)
       VALUES ($1, $2, $3)`,
      [userId, symbol, targetPrice]
    );

    await interaction.user.send(
      `🔔 You will be notified when **${symbol}** hits $${targetPrice}.`
    );

    return await interaction.reply({
      content: `✅ Subscribed to **${symbol}** alert at $${targetPrice}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`❌ /alert failed: ${logError(error)}`);
    return await interaction.reply({
      content: "⚠️ Something went wrong. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
