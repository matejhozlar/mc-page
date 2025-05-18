import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";
import logger from "../logger.js";
import logError from "../utils/logError.js";

const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;
let lastRefreshTime = 0;
let leaderboardMessage = null;

async function fetchLeaderboardEmbed(db) {
  const query = `
      SELECT u.name AS mc_name, u.discord_id, COUNT(*) AS first_place_count
      FROM (
        SELECT DISTINCT ON (stat_type, stat_key) ps.uuid, ps.stat_type, ps.stat_key, ps.value
        FROM player_stats ps
        ORDER BY stat_type, stat_key, value DESC
      ) top_stats
      JOIN users u ON u.uuid = top_stats.uuid
      GROUP BY u.name, u.discord_id
      ORDER BY first_place_count DESC
      LIMIT 10;
    `;

  const { rows } = await db.query(query);

  const medals = ["🥇", "🥈", "🥉"];
  const leaderboard = rows
    .map((row, i) => {
      const prefix = medals[i] || `#${i + 1}`;
      return `${prefix} **${row.mc_name}** — ${row.first_place_count}`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("🏆 Stat Champions: Most 1st Place Finishes")
    .setDescription(leaderboard || "No data found.")
    .setColor(0x9b59b6)
    .setFooter({ text: "Updated" })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId("refresh_stats_champions")
    .setLabel("🔄 Refresh")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  return { embed, row, leaderboardData: rows };
}

export async function initStatsChampionsBoard(db, client, channelId) {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    logger.error("❌ Could not find or access the leaderboard channel.");
    return;
  }

  async function loadLeaderboardMessage() {
    const result = await db.query(
      `SELECT message_id FROM leaderboard_messages WHERE type = 'stats_champions' LIMIT 1`
    );

    const messageId = result.rows[0]?.message_id;
    if (!messageId) return null;

    try {
      return await channel.messages.fetch(messageId);
    } catch (error) {
      logger.warn("⚠️ Failed to fetch saved leaderboard message.");
      return null;
    }
  }

  async function saveLeaderboardMessage(messageId) {
    await db.query(
      `
      INSERT INTO leaderboard_messages (type, channel_id, message_id)
      VALUES ('stats_champions', $1, $2)
      ON CONFLICT (type)
      DO UPDATE SET message_id = EXCLUDED.message_id;
      `,
      [channelId, messageId]
    );
  }

  async function updateLeaderboard() {
    try {
      const { embed, row, leaderboardData } = await fetchLeaderboardEmbed(db);

      if (!leaderboardMessage) {
        leaderboardMessage = await loadLeaderboardMessage();
      }

      if (leaderboardMessage) {
        await leaderboardMessage.edit({ embeds: [embed], components: [row] });
      } else {
        leaderboardMessage = await channel.send({
          embeds: [embed],
          components: [row],
        });
        await saveLeaderboardMessage(leaderboardMessage.id);
      }

      const top = leaderboardData[0];
      if (!top || !top.discord_id) return;

      const { discord_id: topId, mc_name: topName, first_place_count } = top;

      logger.info(
        `🔎 Top Player: ${topName} (${topId}) — ${first_place_count} wins`
      );

      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      const role = await guild.roles.fetch(
        process.env.DISCORD_ONE_ABOVE_ALL_ROLE_ID
      );
      if (!role) return;

      const topMember = await guild.members.fetch(topId).catch(() => null);
      if (!topMember) {
        logger.warn(`⚠️ Could not fetch member with ID ${topId}`);
        return;
      }

      const allMembers = await guild.members.fetch();
      let isNewChampion = false;

      for (const member of allMembers.values()) {
        if (member.roles.cache.has(role.id) && member.id !== topId) {
          await member.roles.remove(role).catch(() => {});
          logger.info(`🗑️ Removed Champion role from ${member.user.tag}`);
          isNewChampion = true;
        }
      }

      if (!topMember.roles.cache.has(role.id)) {
        await topMember.roles.add(role).catch(() => {});
        logger.info(`✅ Gave Champion role to ${topMember.user.tag}`);
        isNewChampion = true;
      }

      if (isNewChampion) {
        const hofChannel = await client.channels.fetch(
          process.env.DISCORD_HALL_OF_FAME_CHANNEL_ID
        );
        if (hofChannel?.isTextBased?.()) {
          const announcementEmbed = new EmbedBuilder()
            .setTitle("🏆 A New Champion Has Risen!")
            .setDescription(
              `🎉 <@${topId}> is now **The Champion** with **${first_place_count}** 1st-place finishes!\n\nAll hail **${topName}**! 👑`
            )
            .setColor(0x00ff4c)
            .setThumbnail(topMember.displayAvatarURL())
            .setFooter({ text: "Hall of Fame Update" })
            .setTimestamp();

          await hofChannel.send({ embeds: [announcementEmbed] });
        }
      }
    } catch (error) {
      logger.error(`❌ updateLeaderboard failed: ${logError(error)}`);
    }
  }

  await updateLeaderboard();

  client.on("interactionCreate", async (interaction) => {
    if (
      !interaction.isButton() ||
      interaction.customId !== "refresh_stats_champions"
    )
      return;

    const now = Date.now();
    const remaining = REFRESH_COOLDOWN_MS - (now - lastRefreshTime);

    if (remaining > 0) {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      return interaction.reply({
        content: `⏳ The leaderboard can only be refreshed every 10 minutes.\nPlease wait ${mins} minute(s) and ${secs} second(s).`,
        flags: MessageFlags.Ephemeral,
      });
    }

    lastRefreshTime = now;
    await interaction.deferUpdate();
    await updateLeaderboard();
  });

  logger.info("✅ Stats Champions Board initialized.");
}

export async function updateStatsChampionsBoard(db) {
  if (typeof leaderboardMessage?.edit === "function") {
    const { embed, row } = await fetchLeaderboardEmbed(db);
    await leaderboardMessage.edit({ embeds: [embed], components: [row] });
  }
}
