import { MessageFlags, ChannelType } from "discord.js";
import logger from "../../../../logger.js";

export default async function submitScreenshot(interaction, client, db) {
  try {
    const userId = interaction.user.id;
    const submissionsChannelId =
      process.env.DISCORD_SCREENSHOT_SUBMISSIONS_CHANNEL_ID;

    // Get user's Minecraft name
    const userResult = await db.query(
      `SELECT name FROM users WHERE discord_id = $1`,
      [userId],
    );

    const mcName = userResult.rows[0]?.name || interaction.user.username;

    // Create thread in submissions channel
    const submissionsChannel =
      await client.channels.fetch(submissionsChannelId);

    const thread = await submissionsChannel.threads.create({
      name: `📸 ${mcName}-submission`,
      autoArchiveDuration: 10080, // 7 days
      reason: `Screenshot contest submission by ${mcName}`,
    });

    // Send instructions in the thread
    await thread.send(
      `<@${userId}> Welcome to your submission thread!\n\n` +
        `**Instructions:**\n` +
        `• Upload your screenshot(s) here (max 3)\n` +
        `• Add a brief description if you'd like\n` +
        `• Make sure your screenshots are from the Createrington server\n\n` +
        `Good luck! 🎮`,
    );

    await interaction.reply({
      content: `✅ Your submission thread has been created: <#${thread.id}>`,
      flags: MessageFlags.Ephemeral,
    });

    logger.info(
      `Screenshot submission thread created for ${mcName} (${userId})`,
    );
  } catch (error) {
    logger.error("Failed to create submission thread:", error);
    await interaction.reply({
      content: "❌ Failed to create submission thread. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
