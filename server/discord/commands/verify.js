import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("verify")
  .setDescription("Verify your token from the email invitation")
  .addStringOption((option) =>
    option
      .setName("token")
      .setDescription("Your unique verification token")
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const token = interaction.options.getString("token");
  const discordId = interaction.user.id;
  const member = interaction.member;

  const hasUnverified = member.roles.cache.has(
    process.env.DISCORD_UNVERIFIED_ROLE_ID
  );

  if (!hasUnverified) {
    return await interaction.reply({
      content: "❌ You are already verified or not eligible to register.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const result = await db.query(
      `SELECT * FROM waitlist_emails WHERE token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return await interaction.reply({
        content:
          "❌ Invalid or expired token.\n📧 If you're stuck, email **admin@create-rington.com** for help.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await db.query(`DELETE FROM waitlist_emails WHERE token = $1`, [token]);

    await db.query(
      `INSERT INTO verified_discords (discord_id)
       VALUES ($1)
       ON CONFLICT (discord_id) DO NOTHING`,
      [discordId]
    );

    return await interaction.reply({
      content:
        "✅ Token verified! You may now use `/register <mc_name>` to join the server.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`❌ Verify command failed: ${logError(error)}`);
    return await interaction.reply({
      content: "⚠️ Something went wrong. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
