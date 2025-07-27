import dotenv from "dotenv";

dotenv.config();

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
