import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import pg from "pg";
import dotenv from "dotenv";
import config from "../../config/index.js";
import { initReviewFlow } from "../../lib/reviewFlow.js";

dotenv.config();

const {
  INACTIVITY_DAYS,
  REPLY_DAYS,
  BLACKLIST,
  AUTO_SHUTDOWN_MINUTES,
  STOP_ON_FIRST_ACTION,
} = config.users;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
await db.connect();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size));
  return chunks;
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const review = initReviewFlow(client, {
    guildId: process.env.DISCORD_GUILD_ID,
    testChannelId: process.env.DISCORD_TEST_CHANNEL_ID,
    announceChannelId: process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID,
    stopOnFirstAction: STOP_ON_FIRST_ACTION,
    autoShutdownMinutes: AUTO_SHUTDOWN_MINUTES,
    customIdPrefix: "inactive30",
    onShutdown: async () => {
      try {
        await db.end();
      } catch {}
    },
  });

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const members = await guild.members.fetch();

    const dbResult = await db.query(
      `
        SELECT discord_id
        FROM users
        WHERE discord_id IS NOT NULL
          AND last_seen IS NOT NULL
          AND last_seen < NOW() - $1::interval
      `,
      [`${INACTIVITY_DAYS} days`]
    );

    const staleIds = dbResult.rows.map((r) => r.discord_id);

    const targets = members.filter(
      (m) =>
        !m.user.bot &&
        staleIds.includes(m.id) &&
        !BLACKLIST.includes(m.user.username) &&
        !BLACKLIST.includes(m.id)
    );

    if (targets.size === 0) {
      console.log(`No users inactive > ${INACTIVITY_DAYS} days.`);
      return review.shutdown();
    }

    const mentions = Array.from(targets.values()).map((m) => `<@${m.id}>`);
    const mentionChunks = chunkArray(mentions, 150);

    const deadline = new Date(Date.now() + REPLY_DAYS * 24 * 60 * 60 * 1000);
    const unix = Math.floor(deadline.getTime() / 1000);
    const timeLeft = `<t:${unix}:R>`;

    for (const [idx, chunk] of mentionChunks.entries()) {
      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Inactive Users (${INACTIVITY_DAYS}+ days)`)
        .setDescription(
          `${chunk.join(
            " "
          )}\n\nYou haven’t logged in for over ${INACTIVITY_DAYS} days.\nPlease join the server or contact an administrator if you still wish to stay.`
        )
        .addFields({ name: "⏳ Time Left to Reply", value: `${timeLeft}` })
        .setColor("Red")
        .setTimestamp();

      await review.postForReview([embed]);
      console.log(
        `Queued batch ${idx + 1}/${mentionChunks.length} for review.`
      );
    }

    console.log("Waiting for Accept/Decline in TEST channel…");
  } catch (err) {
    console.error("Error building review messages:", err);
    return review.shutdown();
  }
});

client.login(process.env.CLIENT_BOT_TOKEN);
