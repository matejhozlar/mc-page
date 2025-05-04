import logger from "../logger.js";

export async function assignTopPlayerRole(db, discordClient) {
  try {
    const { rows } = await db.query(`
      SELECT discord_id, name, play_time_seconds
      FROM users
      WHERE discord_id IS NOT NULL
      ORDER BY play_time_seconds DESC
      LIMIT 1
    `);

    if (!rows.length) return;

    const {
      discord_id: topDiscordId,
      name: topName,
      play_time_seconds,
    } = rows[0];
    const guild = await discordClient.guilds.fetch(
      process.env.DISCORD_GUILD_ID
    );
    const role = await guild.roles.fetch(
      process.env.DISCORD_TOP_PLAYTIME_ROLE_ID
    );
    if (!role) {
      logger.error("❌ Top Player role not found.");
      return;
    }

    // Fetch the top member only
    const topMember = await guild.members.fetch(topDiscordId);

    // Fetch only members who have the role
    const roleMembers = role.members;

    // Remove role from others
    for (const member of roleMembers.values()) {
      if (member.id !== topDiscordId) {
        await member.roles.remove(role);
        logger.info(`🗑️ Removed Top Player role from ${member.user.tag}`);
      }
    }

    // Assign role to top player if not already
    if (!topMember.roles.cache.has(role.id)) {
      await topMember.roles.add(role);
      logger.info(`✅ Gave Top Player role to ${topMember.user.tag}`);

      const announcementChannel = await guild.channels.fetch(
        process.env.DISCORD_HALL_OF_FAME_CHANNEL_ID
      );
      if (announcementChannel?.isTextBased) {
        const hours = Math.floor(play_time_seconds / 3600);
        const minutes = Math.floor((play_time_seconds % 3600) / 60);
        await announcementChannel.send(
          `🎉 <@${topDiscordId}> is now the top player with **${hours}h ${minutes}m** of playtime! 👑`
        );
      }
    } else {
      logger.info(`✅ Top Player role already held by ${topMember.user.tag}`);
    }
  } catch (error) {
    logger.error(`⚠️ Error assigning top player role: ${logError(error)}`);
  }
}
