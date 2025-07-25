import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("money")
  .setDescription("Check your current balance");

export async function execute(interaction, db) {
  const discordId = interaction.user.id;

  try {
    const result = await db.query(
      `SELECT balance, name FROM user_funds WHERE discord_id = $1`,
      [discordId]
    );

    if (result.rowCount === 0) {
      return await interaction.reply({
        content: `❌ You don’t have your Minecraft account linked yet. Use **/link <username>** to connect your account.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const raw = result.rows[0].balance;
    const num = typeof raw === "string" ? parseFloat(raw) : raw;
    const balanceInt = Math.floor(num);

    const formattedBalance = balanceInt.toLocaleString("en-US");

    return await interaction.reply({
      content: `💰 Balance: **$${formattedBalance}**`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`❌ /money command failed: ${error}`);
    return await interaction.reply({
      content:
        "⚠️ Something went wrong while fetching your balance. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
