import type { GuildMember } from "discord.js";
import type { Snowflake } from "discord.js";
import logger from "../../../logger";

function hasSend(
  x: unknown
): x is { send: (content: string) => Promise<unknown> } {
  return !!x && typeof (x as any).send === "function";
}

/**
 * Handles new member joins by assigning the "Unverified" role and sending instructions.
 */
export default async function onGuildMemberAdd(
  member: GuildMember
): Promise<void> {
  const unverifiedRoleId = process.env.DISCORD_UNVERIFIED_ROLE_ID as
    | Snowflake
    | undefined;
  const verifyChannelId = process.env.DISCORD_VERIFY_CHANNEL_ID as
    | Snowflake
    | undefined;

  if (!unverifiedRoleId || !verifyChannelId) {
    logger.warn(
      "Missing DISCORD_UNVERIFIED_ROLE_ID or DISCORD_VERIFY_CHANNEL_ID env vars."
    );
    return;
  }

  try {
    await member.roles.add(unverifiedRoleId);
    logger.info("Assigned Unverified role to", member.user.tag);

    const channel =
      member.guild.channels.cache.get(verifyChannelId) ??
      (await member.guild.channels.fetch(verifyChannelId).catch(() => null));

    if (channel && channel.isTextBased() && hasSend(channel)) {
      await channel.send(
        `Welcome <@${member.user.id}> to **Createrington**!\n\n**Step 1: Verify Your Access Token**\nTo begin, please type:\n\`/verify <your_token>\`\n\nYour access token was sent to the email address you used when applying to join. If you do not see it, please check your inbox and spam folder.\n\n**Step 2: Register Your Minecraft Username**\nAfter verification, register your Minecraft username by typing:\n/register \`<your_minecraft_username>\`\n\nExample:\n\`/register Notch\`\n\n**Important Notes:**\n- \`mc_name\` must match your exact Minecraft username (spelling must be correct, capitalization does not matter).\n- Invalid usernames or incorrect tokens will prevent access.\n\nIf you have not yet applied to join, please complete your application here: [Application Link](<https://create-rington.com/apply-to-join>)\n\n🎉 We look forward to seeing you in-game soon!`
      );
    } else {
      logger.warn("Verify channel not found or is not text-based.");
    }
  } catch (error) {
    logger.error("Error assigning role or sending message:", error);
  }
}
