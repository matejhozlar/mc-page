import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { v4 as uuidv4 } from "uuid";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("token")
  .setDescription("Generate a temporary chat token");

export async function execute(interaction, db) {
  const token = uuidv4();
  const userId = interaction.user.id;
  const displayName =
    interaction.member?.displayName || interaction.user.username;

  try {
    await db.query(
      `INSERT INTO chat_tokens (token, discord_id, discord_name, expires_at)
       VALUES ($1, $2, $3, NOW() + interval '30 days')
       ON CONFLICT (discord_id)
       DO UPDATE SET token = $1, discord_name = $3, expires_at = NOW() + interval '30 days'`,
      [token, userId, displayName]
    );

    await interaction.reply({
      content: `Here's your token:\n\`${token}\`\n\n✅ It's valid for 30 days.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`Token insert/update failed: ${logError(error)}`);
    await interaction.reply({
      content: "❌ Could not generate token. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
