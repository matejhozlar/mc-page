import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import pg from "pg";
import dotenv from "dotenv";
import { initReviewFlow } from "../../lib/reviewFlow.js";

dotenv.config();

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
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const review = initReviewFlow(client, {
    guildId: process.env.DISCORD_GUILD_ID,
    testChannelId: process.env.DISCORD_TEST_CHANNEL_ID,
    announceChannelId: process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID,
    stopOnFirstAction: false,
    autoShutdownMinutes: 30,
    customIdPrefix: "nullseen",
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
      `SELECT discord_id FROM users WHERE discord_id IS NOT NULL AND last_seen IS NULL`
    );
    const ids = dbResult.rows.map((r) => r.discord_id);

    const targets = members.filter((m) => !m.user.bot && ids.includes(m.id));
    if (targets.size === 0) {
      console.log("No users with NULL last_seen found.");
      return review.shutdown();
    }

    const mentionList = Array.from(targets.values()).map((m) => `<@${m.id}>`);
    const chunks = chunkArray(mentionList, 150);

    const deadline = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
    const unix = Math.floor(deadline.getTime() / 1000);
    const timeLeft = `<t:${unix}:R>`;

    for (const [idx, chunk] of chunks.entries()) {
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Inactive Users")
        .setDescription(
          `${chunk.join(
            " "
          )}\n\nYou haven’t joined the server yet.\nPlease do so or contact an admin.`
        )
        .addFields({ name: "⏳ Time Left", value: `${timeLeft}` })
        .setColor("Red")
        .setTimestamp();

      await review.postForReview([embed]);
      console.log(`Queued batch ${idx + 1}/${chunks.length} for review.`);
    }

    console.log("Waiting for Accept/Decline in TEST channel…");
  } catch (err) {
    console.error("Error building review messages:", err);
    return review.shutdown();
  }
});

client.login(process.env.CLIENT_BOT_TOKEN);
