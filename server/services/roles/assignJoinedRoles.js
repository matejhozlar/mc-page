import cron from "node-cron";
import logger from "../../logger.js";
import { Client } from "discord.js"; // Assuming discord.js v14
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

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
 * @param {Client} discordClient
 */
export async function assignMembershipDurationRoles(db, discordClient) {
  try {
    const { rows: users } = await db.query(`
      SELECT discord_id, first_joined
      FROM users
      WHERE discord_id IS NOT NULL AND first_joined IS NOT NULL
    `);

    const guild = await discordClient.guilds.fetch(
      process.env.DISCORD_GUILD_ID
    );
    const now = dayjs().tz("Europe/Berlin");

    for (const user of users) {
      const member = await guild.members
        .fetch(user.discord_id)
        .catch(() => null);
      if (!member) continue;

      const joinedDate = dayjs(user.first_joined).tz("Europe/Berlin");
      const daysInServer = now.diff(joinedDate, "day");

      const targetTier = ROLE_TIERS.find(
        (tier) => daysInServer >= tier.minDays && daysInServer <= tier.maxDays
      );
      if (!targetTier) continue;

      // Check if user already has target role
      if (member.roles.cache.has(targetTier.id)) continue;

      // Remove all tier roles
      const tierRoleIds = ROLE_TIERS.map((t) => t.id);
      const rolesToRemove = member.roles.cache.filter((role) =>
        tierRoleIds.includes(role.id)
      );
      await member.roles.remove(rolesToRemove).catch(logger.error);

      // Add target role
      await member.roles.add(targetTier.id).catch(logger.error);

      logger.info(
        `Assigned role "${targetTier.name}" to user ${user.discord_id} (${daysInServer} days)`
      );

      const channel = guild.channels.cache.get(
        process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID
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
