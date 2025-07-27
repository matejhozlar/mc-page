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
    logger.info(`✅ Assigned Unverified role to ${member.user.tag}`);

    const channel = member.guild.channels.cache.get(verifyChannelId);
    if (channel?.isTextBased()) {
      await channel.send(
        `👋 Welcome <@${member.user.id}> to **Createrington**!\n\n🔑 **First Step:** You must verify your **access token**.\nPlease type: \`/verify <your_token>\`\n\n📬 Your token was sent to your email when you applied to join. Check your inbox (and spam folder)!\n\n⚡ **After verifying**, you can then use: \`/register <your_minecraft_username>\`\n(Example: \`/register Notch\`)\n\n⚠️ **Important:**\n- \`mc_name\` means your exact **Minecraft username** (correct spelling, capitalization doesn't matter).\n- **Fake usernames** or **wrong tokens** will block your access.\n\n🎉 We're excited to have you join us — see you in-game soon!`
      );
    }
  } catch (error) {
    logger.error(`❌ Error assigning role or sending message: ${error}`);
  }
}
