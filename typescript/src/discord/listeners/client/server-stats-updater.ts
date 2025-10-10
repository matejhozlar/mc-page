import type { Client, Guild, Snowflake } from "discord.js";
import logger from "../../../logger";
import { exitIfNotProduction } from "../../../utils/production/env-guard";

function canSetName(
  ch: unknown
): ch is { setName: (name: string) => Promise<unknown> } {
  return !!ch && typeof (ch as any).setName === "function";
}
/**
 * Periodically updates server stat channel names with current member/bot counts.
 * Only runs in production environment.
 *
 * @param {import('discord.js').Client} client - The Discord.js client instance.
 */
export default function startUpdatingServerStats(client: Client): void {
  if (!exitIfNotProduction()) return;

  const guildId = process.env.DISCORD_GUILD_ID as Snowflake | undefined;
  const membersChannelId = process.env.DISCORD_MEMBERS_COUNTER_CHANNEL_ID as
    | Snowflake
    | undefined;
  const botsChannelId = process.env.DISCORD_BOTS_COUNTER_CHANNEL_ID as
    | Snowflake
    | undefined;
  const allMembersChannelId = process.env
    .DISCORD_ALL_MEMBERS_COUNTER_CHANNEL_ID as Snowflake | undefined;

  if (!guildId) {
    logger.warn("DISCORD_GUILD_ID is not set; server stats updater disabled.");
    return;
  }

  let lastMembers: number | null = null;
  let lastBots: number | null = null;
  let lastTotal: number | null = null;

  async function updateStats(): Promise<void> {
    try {
      const guild: Guild = await client.guilds.fetch(guildId as string);
      await guild.members.fetch();

      const members = guild.members.cache.filter((m) => !m.user.bot).size;
      const bots = guild.members.cache.filter((m) => m.user.bot).size;
      const total = members + bots;

      if (members === lastMembers && bots === lastBots && total === lastTotal) {
        return;
      }

      lastMembers = members;
      lastBots = bots;
      lastTotal = total;

      const membersChannel = membersChannelId
        ? guild.channels.cache.get(membersChannelId)
        : undefined;
      const botsChannel = botsChannelId
        ? guild.channels.cache.get(botsChannelId)
        : undefined;
      const allMembersChannel = allMembersChannelId
        ? guild.channels.cache.get(allMembersChannelId)
        : undefined;

      if (membersChannel && canSetName(membersChannel)) {
        await membersChannel.setName(`Members: ${members}`);
      }
      if (botsChannel && canSetName(botsChannel)) {
        await botsChannel.setName(`Bots: ${bots}`);
      }
      if (allMembersChannel && canSetName(allMembersChannel)) {
        await allMembersChannel.setName(`All Members: ${total}`);
      }

      logger.info("Server stats updated.");
    } catch (error) {
      logger.error(
        `Failed to update server stats: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  void updateStats();
  setInterval(updateStats, 30 * 60 * 1000);
}
