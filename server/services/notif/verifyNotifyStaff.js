import dotenv from "dotenv";

dotenv.config();

/**
 * Notifies the staff in the verification channel about a failed verification attempt.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - The Discord interaction from the user.
 * @param {string} reason - The reason the verification failed or requires staff attention.
 * @param {string} mcName - The Minecraft username of the user.
 * @param {string} [uuid="Unknown"] - The Minecraft UUID of the user. Defaults to "Unknown" if not provided.
 * @returns {Promise<void>}
 */
export async function verifyNotifyStaff(
  interaction,
  reason,
  mcName,
  uuid = "Unknown"
) {
  const verifyChannel = interaction.guild.channels.cache.get(
    process.env.DISCORD_VERIFY_CHANNEL_ID
  );
  const adminPing = `<@&${process.env.DISCORD_ADMIN_ROLE_ID}>`;

  if (verifyChannel?.isTextBased()) {
    await verifyChannel.send(
      `🚨 **Verification Issue Detected**\n` +
        `User: <@${interaction.user.id}> (${interaction.user.tag})\n` +
        `Minecraft Username: \`${mcName}\`\n` +
        `UUID: \`${uuid}\`\n` +
        `Reason: ${reason}\n` +
        `${adminPing}`
    );
  }
}
