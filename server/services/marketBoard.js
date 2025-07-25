import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import logger from "../logger.js";

const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;
let lastRefreshTime = 0;
let leaderboardMessage = null;

async function fetchMarketLeaderboardEmbed(db) {
  const query = `
    SELECT u.name AS mc_name, u.discord_id,
           SUM(ut.amount * ct.price_per_unit) AS total_value
    FROM user_tokens ut
    JOIN users u ON u.discord_id = ut.discord_id
    JOIN crypto_tokens ct ON ut.token_id = ct.id
    WHERE ut.amount > 0
    GROUP BY u.name, u.discord_id
    ORDER BY total_value DESC
    LIMIT 10;
  `;

  const { rows } = await db.query(query);

  const medals = ["🥇", "🥈", "🥉"];
  const leaderboard = rows
    .map((row, i) => {
      const prefix = medals[i] || `#${i + 1}`;
      const value = parseFloat(row.total_value || 0).toFixed(2);
      return `${prefix} **${row.mc_name}** — $${value}`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("📈 Top Market Portfolios")
    .setDescription(leaderboard || "No data available.")
    .setColor(0xff9900)
    .setFooter({ text: "Updated" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("refresh_market_leaderboard")
      .setLabel("🔄 Refresh")
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, row, leaderboardData: rows };
}

export async function initMarketLeaderboard(db, client, channelId) {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    logger.error("❌ Could not find or access the market leaderboard channel.");
    return;
  }

  async function loadLeaderboardMessage() {
    const result = await db.query(
      `SELECT message_id FROM leaderboard_messages WHERE type = 'market_leaderboard' LIMIT 1`
    );
    const messageId = result.rows[0]?.message_id;
    if (!messageId) return null;

    try {
      return await channel.messages.fetch(messageId);
    } catch {
      return null;
    }
  }

  async function saveLeaderboardMessage(messageId) {
    await db.query(
      `INSERT INTO leaderboard_messages (type, channel_id, message_id)
       VALUES ('market_leaderboard', $1, $2)
       ON CONFLICT (type) DO UPDATE SET message_id = EXCLUDED.message_id;`,
      [channelId, messageId]
    );
  }

  async function updateLeaderboard() {
    try {
      const { embed, row, leaderboardData } = await fetchMarketLeaderboardEmbed(
        db
      );

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

      const { discord_id: topId, mc_name: topName, total_value } = top;

      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      const role = await guild.roles.fetch(
        process.env.DISCORD_CRYPTO_BARON_ROLE_ID
      );
      if (!role) return;

      const topMember = await guild.members.fetch(topId).catch(() => null);
      if (!topMember) return;

      const allMembers = await guild.members.fetch();
      let isNewLeader = false;

      for (const member of allMembers.values()) {
        if (member.roles.cache.has(role.id) && member.id !== topId) {
          await member.roles.remove(role).catch(() => {});
          logger.info(`🗑️ Removed Crypto Baron from ${member.user.tag}`);
          isNewLeader = true;
        }
      }

      if (!topMember.roles.cache.has(role.id)) {
        await topMember.roles.add(role).catch(() => {});
        logger.info(`👑 Gave Crypto Baron to ${topMember.user.tag}`);
        isNewLeader = true;
      }

      if (isNewLeader) {
        const hofChannel = await client.channels.fetch(
          process.env.DISCORD_HALL_OF_FAME_CHANNEL_ID
        );
        if (hofChannel?.isTextBased()) {
          const announcement = new EmbedBuilder()
            .setTitle("💰 New Crypto Baron Crowned!")
            .setDescription(
              `🏆 <@${topId}> now holds the **largest portfolio** at **$${parseFloat(
                total_value
              ).toFixed(2)}**!\nLong live **${topName}**! 🪙`
            )
            .setColor(0xff9900)
            .setThumbnail(topMember.displayAvatarURL())
            .setFooter({ text: "Hall of Fame — Market Leader" })
            .setTimestamp();

          await hofChannel.send({ embeds: [announcement] });
        }
      }
    } catch (error) {
      logger.error(`❌ updateMarketLeaderboard failed: ${error}`);
    }
  }

  await updateLeaderboard();

  client.on("interactionCreate", async (interaction) => {
    if (
      !interaction.isButton() ||
      interaction.customId !== "refresh_market_leaderboard"
    )
      return;

    const now = Date.now();
    const remaining = REFRESH_COOLDOWN_MS - (now - lastRefreshTime);

    if (remaining > 0) {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      return interaction.reply({
        content: `⏳ This leaderboard can only be refreshed every 10 minutes.\nPlease wait ${mins}m ${secs}s.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    lastRefreshTime = now;
    await interaction.deferUpdate();
    await updateLeaderboard();
  });

  logger.info("✅ Market Leaderboard initialized.");
}

export async function updateMarketLeaderboard(db) {
  if (typeof leaderboardMessage?.edit === "function") {
    const { embed, row } = await fetchMarketLeaderboardEmbed(db);
    await leaderboardMessage.edit({ embeds: [embed], components: [row] });
  }
}
