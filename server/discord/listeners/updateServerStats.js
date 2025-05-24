import logger from "../../logger.js";

export default function startUpdatingServerStats(client) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const membersChannelId = process.env.DISCORD_MEMBERS_COUNTER_CHANNEL_ID;
  const botsChannelId = process.env.DISCORD_BOTS_COUNTER_CHANNEL_ID;
  const allMembersChannelId = process.env.DISCORD_ALL_MEMBERS_COUNTER_CANNEL_ID;

  let lastMembers = null;
  let lastBots = null;
  let lastTotal = null;

  async function updateStats() {
    try {
      const guild = await client.guilds.fetch(guildId);
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

      const membersChannel = guild.channels.cache.get(membersChannelId);
      const botsChannel = guild.channels.cache.get(botsChannelId);
      const allMembersChannel = guild.channels.cache.get(allMembersChannelId);

      if (membersChannel) await membersChannel.setName(`Members: ${members}`);
      if (botsChannel) await botsChannel.setName(`Bots: ${bots}`);
      if (allMembersChannel)
        await allMembersChannel.setName(`All Members: ${total}`);

      logger.info("📈 Server stats updated.");
    } catch (error) {
      logger.error(`❌ Failed to update server stats: ${error.message}`);
    }
  }

  updateStats();
  setInterval(updateStats, 30 * 60 * 1000);
}
