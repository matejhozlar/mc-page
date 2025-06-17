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
  )
  .addStringOption((option) =>
    option
      .setName("direction")
      .setDescription("Trigger direction: above or below target price")
      .setRequired(false)
      .addChoices(
        { name: "Above", value: "above" },
        { name: "Below", value: "below" }
      )
  );

export async function execute(interaction, db) {
  const userId = interaction.user.id;
  const symbol = interaction.options.getString("token").toUpperCase();
  const targetPrice = interaction.options.getNumber("price");
  const direction = (
    interaction.options.getString("direction") || "above"
  ).toLowerCase();

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
      `INSERT INTO token_price_alerts (discord_id, token_symbol, target_price, direction)
       VALUES ($1, $2, $3, $4)`,
      [userId, symbol, targetPrice, direction]
    );

    await interaction.user.send(
      `🔔 You will be notified when **${symbol}** ${
        direction === "below" ? "drops below" : "reaches"
      } $${targetPrice}.`
    );

    await interaction.reply({
      content: `✅ Subscribed to **${symbol}** alert when price ${
        direction === "below" ? "drops below" : "rises above"
      } $${targetPrice}`,
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
