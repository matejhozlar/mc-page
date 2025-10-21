import logger from "../../logger.js";
import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import config from "../../config/index.js";

let lastServerCurrencyUse = 0;
const COOLDOWN_MS = 10 * 60 * 1000;
const { GOLD } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("server-currency")
  .setDescription("Show the server-wide currency total with a breakdown");

export const prodOnly = true;

/**
 * Calculates the server currency total without mutating any DB state.
 * Formula:
 *  total = SUM(user_funds.balance)
 *        + SUM(user_tokens.amount * crypto_tokens.price_per_unit)
 *        + memecoin_tax_tracker.total_collected (id=1)
 *        + SUM(company_funds.balance WHERE company_id != 1000)
 */
export async function execute(interaction, db) {
  const now = Date.now();

  if (now - lastServerCurrencyUse < COOLDOWN_MS) {
    const remainingMs = COOLDOWN_MS - (now - lastServerCurrencyUse);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    return await interaction.reply({
      content: `⏳ Please wait ${minutes} minute(s) and ${seconds} second(s) before using this command again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const userFundsRes = await db.query(`
      SELECT COALESCE(SUM(balance), 0) AS total_user_funds
      FROM user_funds
    `);
    const totalUserFunds = Number(userFundsRes.rows[0].total_user_funds || 0);

    const tokenValueRes = await db.query(`
      SELECT COALESCE(SUM(ut.amount * ct.price_per_unit), 0) AS total_token_value
      FROM user_tokens ut
      JOIN crypto_tokens ct ON ut.token_id = ct.id
    `);
    const totalTokenValue = Number(
      tokenValueRes.rows[0].total_token_value || 0
    );

    const taxRes = await db.query(`
      SELECT COALESCE(total_collected, 0) AS total_collected
      FROM memecoin_tax_tracker
      WHERE id = 1
    `);
    const taxCollected = Number(taxRes.rows[0]?.total_collected || 0);

    const companiesRes = await db.query(`
      SELECT COALESCE(SUM(balance), 0) AS total_other_companies
      FROM company_funds
      WHERE company_id != 1000
    `);
    const totalOtherCompanies = Number(
      companiesRes.rows[0].total_other_companies || 0
    );

    const totalBalance =
      totalUserFunds + totalTokenValue + taxCollected + totalOtherCompanies;

    const formatMoney = (n) =>
      n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const embed = new EmbedBuilder()
      .setTitle("🏦 Total Circulating Currency")
      .setDescription(`$${formatMoney(totalBalance)}`)
      .addFields(
        {
          name: "Wallets",
          value: `$${formatMoney(totalUserFunds)}`,
          inline: true,
        },
        {
          name: "Token Holdings",
          value: `$${formatMoney(totalTokenValue)}`,
          inline: true,
        },
        {
          name: "Taxes Collected",
          value: `$${formatMoney(taxCollected)}`,
          inline: true,
        },
        {
          name: "Companies",
          value: `$${formatMoney(totalOtherCompanies)}`,
          inline: true,
        }
      )
      .setColor(GOLD)
      .setFooter({ text: "Total circulating currency of Createrington" });

    lastServerCurrencyUse = now;

    return await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error("/server-currency failed:", error);
    return await interaction.reply({
      content:
        "⚠️ Could not calculate the server currency snapshot. Try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
