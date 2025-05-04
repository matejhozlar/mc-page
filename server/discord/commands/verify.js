import { SlashCommandBuilder } from "discord.js";
import logger from "../../logger.js";

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
      ephemeral: true,
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
        ephemeral: true,
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
      ephemeral: true,
    });
  } catch (err) {
    logger.error("❌ Verify command failed:", err);
    return await interaction.reply({
      content: "⚠️ Something went wrong. Please try again later.",
      ephemeral: true,
    });
  }
}
