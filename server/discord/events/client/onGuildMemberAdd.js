import logger from "../../../logger.js";

/**
 * Handles new member joins by assigning the "Unverified" role and sending instructions.
 * @param {import("discord.js").GuildMember} member
 */
export default async function onGuilderMemberAdd(member) {
  const unverifiedRoleId = process.env.DISCORD_UNVERIFIED_ROLE_ID;
  const verifyChannelId = process.env.DISCORD_VERIFY_CHANNEL_ID;

  try {
    await member.roles.add(unverifiedRoleId);
    logger.info("Assigned Unverified role to", member.user.tag);

    const channel = member.guild.channels.cache.get(verifyChannelId);
    if (channel?.isTextBased()) {
      await channel.send(
        `Welcome <@${member.user.id}> to **Createrington**!\n\n**Step 1: Verify Your Access Token**\nTo begin, please type:\n\`/verify <your_token>\`\n\nYour access token was sent to the email address you used when applying to join. If you do not see it, please check your inbox and spam folder.\n\n**Step 2: Register Your Minecraft Username**\nAfter verification, register your Minecraft username by typing:\n/register \`<your_minecraft_username>\`\n\nExample:\n\`/register Notch\`\n\n**Important Notes:**\n- \`mc_name\` must match your exact Minecraft username (spelling must be correct, capitalization does not matter).\n- Invalid usernames or incorrect tokens will prevent access.\n\nIf you have not yet applied to join, please complete your application here: [Application Link](<https://createrington.com/apply-to-join>)\n\n🎉 We look forward to seeing you in-game soon!`,
      );
    }
  } catch (error) {
    logger.error("Error assigning role or sending message:", error);
  }
}
