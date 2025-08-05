import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import config from "../../config/index.js";

const { GOLD } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("crypto-portfolio")
  .setDescription("View a user's crypto portfolio")
  .addStringOption((option) =>
    option
      .setName("username")
      .setDescription("Minecraft username (optional)")
      .setRequired(false)
  );

export const prodOnly = true;

export async function execute(interaction, db) {
  const inputName = interaction.options.getString("username");
  const viewerId = interaction.user.id;

  try {
    let userQuery;
    let param;

    if (inputName) {
      userQuery = `
        SELECT u.name AS username, ut.amount, ct.symbol, ct.price_per_unit
        FROM users u
        JOIN user_tokens ut ON u.discord_id = ut.discord_id
        JOIN crypto_tokens ct ON ut.token_id = ct.id
        WHERE LOWER(u.name) = LOWER($1) AND ut.amount > 0
      `;
      param = inputName;
    } else {
      userQuery = `
        SELECT u.name AS username, ut.amount, ct.symbol, ct.price_per_unit
        FROM users u
        JOIN user_tokens ut ON u.discord_id = ut.discord_id
        JOIN crypto_tokens ct ON ut.token_id = ct.id
        WHERE u.discord_id = $1 AND ut.amount > 0
      `;
      param = viewerId;
    }

    const { rows } = await db.query(userQuery, [param]);

    if (!rows.length) {
      return await interaction.reply({
        content: inputName
          ? `❌ No portfolio found for **${inputName}**.`
          : `❌ You don't own any tokens yet.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const username = rows[0].username || inputName || "Unknown";
    let totalValue = 0;

    const tokenLines = rows.map((entry) => {
      const { symbol, amount, price_per_unit } = entry;
      const tokenValue = parseFloat(amount) * parseFloat(price_per_unit);
      totalValue += tokenValue;

      return `• **${symbol}** — ${parseFloat(amount).toFixed(
        4
      )} tokens ($${tokenValue.toFixed(2)})`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${username}'s Crypto Portfolio`)
      .setDescription(tokenLines.join("\n"))
      .addFields({
        name: "💰 Total Value",
        value: `$${totalValue.toFixed(2)}`,
        inline: false,
      })
      .setColor(GOLD)
      .setFooter({ text: "Createrington Crypto" })
      .setTimestamp();

    return await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error(`❌ /crypto-portfolio failed: ${error}`);
    return await interaction.reply({
      content: "⚠️ Failed to load portfolio. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
