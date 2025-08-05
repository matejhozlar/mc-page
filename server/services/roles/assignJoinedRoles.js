import logger from "../../logger.js";
import { Client } from "discord.js";

const ROLE_TIERS = [
  {
    name: "Newcomer",
    minDays: 0,
    maxDays: 30,
    id: process.env.DISCORD_NEWCOMER_ROLE_ID,
  },
  {
    name: "Adventurer",
    minDays: 31,
    maxDays: 90,
    id: process.env.DISCORD_ADVENTURER_ROLE_ID,
  },
  {
    name: "Regular",
    minDays: 91,
    maxDays: 180,
    id: process.env.DISCORD_REGULAR_ROLE_ID,
  },
  {
    name: "Veteran",
    minDays: 181,
    maxDays: 365,
    id: process.env.DISCORD_VETERAN_ROLE_ID,
  },
  {
    name: "Legend",
    minDays: 366,
    maxDays: Infinity,
    id: process.env.DISCORD_LEGEND_ROLE_ID,
  },
];

/**
 * Assigns membership duration roles based on first_joined date.
 * @param {import('pg').Pool} db
 * @param {Client} clientBot
 */
export async function assignMembershipDurationRoles(db, clientBot) {
  try {
    const { rows: users } = await db.query(`
      SELECT discord_id, first_joined
      FROM users
      WHERE discord_id IS NOT NULL AND first_joined IS NOT NULL
    `);

    const guild = await clientBot.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const now = new Date();

    for (const user of users) {
      const member = await guild.members
        .fetch(user.discord_id)
        .catch(() => null);
      if (!member) continue;

      const joinedDate = new Date(user.first_joined);

      const diffTime = now.getTime() - joinedDate.getTime();
      const daysInServer = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const targetTier = ROLE_TIERS.find(
        (tier) => daysInServer >= tier.minDays && daysInServer <= tier.maxDays
      );
      if (!targetTier) continue;

      if (member.roles.cache.has(targetTier.id)) continue;

      const tierRoleIds = ROLE_TIERS.map((t) => t.id);
      const rolesToRemove = member.roles.cache.filter((role) =>
        tierRoleIds.includes(role.id)
      );
      await member.roles.remove(rolesToRemove).catch(logger.error);

      await member.roles.add(targetTier.id).catch(logger.error);

      logger.info(
        `Assigned role "${targetTier.name}" to user ${user.discord_id} (${daysInServer} days)`
      );

      const channel = guild.channels.cache.get(
        process.env.DISCORD_HALL_OF_FAME_CHANNEL_ID
      );
      if (channel?.isTextBased()) {
        await channel.send(
          `🎉 <@${user.discord_id}> has been assigned the **${targetTier.name}** role for being here ${daysInServer} days!`
        );
      }
    }
  } catch (error) {
    logger.error(`Error assigning membership duration roles: ${error}`);
  }
}
