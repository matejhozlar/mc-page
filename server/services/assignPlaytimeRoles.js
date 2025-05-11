import logger from "../logger.js";
import logError from "../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

const ROLE_TIERS = [
  {
    name: "Stone",
    minHours: 0,
    maxHours: 20,
    id: process.env.DISCORD_STONE_ROLE_ID,
  },
  {
    name: "Copper",
    minHours: 20,
    maxHours: 40,
    id: process.env.DISCORD_COPPER_ROLE_ID,
  },
  {
    name: "Iron",
    minHours: 40,
    maxHours: 60,
    id: process.env.DISCORD_IRON_ROLE_ID,
  },
  {
    name: "Gold",
    minHours: 60,
    maxHours: 100,
    id: process.env.DISCORD_GOLD_ROLE_ID,
  },
  {
    name: "Diamond",
    minHours: 100,
    maxHours: 200,
    id: process.env.DISCORD_DIAMOND_ROLE_ID,
  },
  {
    name: "Crimson",
    minHours: 200,
    maxHours: 300,
    id: process.env.DISCORD_CRIMSON_ROLE_ID,
  },
  {
    name: "Silver",
    minHours: 300,
    maxHours: 400,
    id: process.env.DISCORD_SILVER_ROLE_ID,
  },
  {
    name: "Electrum",
    minHours: 400,
    maxHours: 1000,
    id: process.env.DISCORD_ELECTRUM_ROLE_ID,
  },
  {
    name: "Tyrian",
    minHours: 1000,
    maxHours: Infinity,
    id: process.env.DISCORD_TYRIAN_ROLE_ID,
  },
];

export async function assignPlaytimeRole(db, discordClient, isInitial = false) {
  try {
    const result = await db.query(`
        SELECT name, discord_id, play_time_seconds
        FROM users
        WHERE discord_id IS NOT NULL AND play_time_seconds IS NOT NULL
      `);

    const guild = await discordClient.guilds.fetch(
      process.env.DISCORD_GUILD_ID
    );

    for (const user of result.rows) {
      const playtimeHours = user.play_time_seconds / 3600;
      const member = await guild.members
        .fetch(user.discord_id)
        .catch(() => null);
      if (!member) continue;

      const targetTier = ROLE_TIERS.find(
        (tier) =>
          playtimeHours >= tier.minHours && playtimeHours < tier.maxHours
      );

      if (!targetTier) continue;

      const hasRole = member.roles.cache.has(targetTier.id);
      if (hasRole) continue;

      const tierRoleIds = ROLE_TIERS.map((r) => r.id);
      const rolesToRemove = member.roles.cache.filter((role) =>
        tierRoleIds.includes(role.id)
      );

      await member.roles.remove(rolesToRemove).catch(logger.error);
      await member.roles.add(targetTier.id).catch(logger.error);

      logger.info(
        `✅ Assigned ${targetTier.name} role to ${
          user.name
        } (${playtimeHours.toFixed(1)}h)`
      );

      if (!isInitial) {
        const hallOfFameChannel = guild.channels.cache.get(
          process.env.DISCORD_HALL_OF_FAME_CHANNEL_ID
        );
        if (hallOfFameChannel?.isTextBased()) {
          await hallOfFameChannel.send(
            `🎉 <@${member.id}> has ranked up to **${
              targetTier.name
            }** with **${playtimeHours.toFixed(1)}h** of playtime! 🏅`
          );
        }
      }
    }
  } catch (error) {
    logger.error(`❌ Error assigning playtime roles: ${logError(error)}`);
  }
}
