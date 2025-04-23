export async function assignTopPlayerRole(db, discordClient) {
  try {
    const { rows } = await db.query(`
        SELECT discord_id
        FROM users
        WHERE discord_id IS NOT NULL
        ORDER BY play_time_seconds DESC
        LIMIT 1
      `);

    if (!rows.length) return;

    const topDiscordId = rows[0].discord_id;

    const guild = await discordClient.guilds.fetch(
      process.env.DISCORD_GUILD_ID
    );

    const role = await guild.roles.fetch(
      process.env.DISCORD_TOP_PLAYTIME_ROLE_ID
    );

    if (!role) {
      console.error("❌ Top Player role not found.");
      return;
    }

    const members = await guild.members.fetch();

    for (const member of members.values()) {
      const hasRole = member.roles.cache.has(role.id);
      const isTopPlayer = member.id === topDiscordId;

      if (isTopPlayer && !hasRole) {
        await member.roles.add(role);
        console.log(`✅ Gave Top Player role to ${member.user.tag}`);
      } else if (!isTopPlayer && hasRole) {
        await member.roles.remove(role);
        console.log(`🗑️ Removed Top Player role from ${member.user.tag}`);
      } else if (isTopPlayer && hasRole) {
        console.log(`✅ Top Player role stayed the same, ${member.user.tag}`);
      }
    }
  } catch (err) {
    console.error("⚠️ Error assigning top player role:", err.message);
  }
}
