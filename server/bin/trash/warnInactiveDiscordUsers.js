import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import pg from "pg";
import dotenv from "dotenv";

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

client.once("ready", async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const members = await guild.members.fetch();

    const dbResult = await db.query(`
      SELECT discord_id FROM users 
      WHERE discord_id IS NOT NULL AND last_seen IS NULL
    `);
    const nullLastSeenIds = dbResult.rows.map((row) => row.discord_id);

    const targetMembers = members.filter(
      (member) => !member.user.bot && nullLastSeenIds.includes(member.id)
    );

    if (targetMembers.size === 0) {
      console.log("✅ No users with NULL last_seen found.");
      return;
    }

    const channel = await guild.channels.fetch(
      process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    const mentionList = Array.from(targetMembers.values())
      .map((member) => `<@${member.id}>`)
      .join(" ");

    const deadline = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
    const unix = Math.floor(deadline.getTime() / 1000);
    const timeLeft = `<t:${unix}:R>`;

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Inactive Users")
      .setDescription(
        `${mentionList}\n\nYou haven’t joined the server yet.\nPlease do so or contact an admin.`
      )
      .addFields({
        name: "⏳ Time Left",
        value: `${timeLeft}`,
      })
      .setColor("Red")
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    console.log("📨 Sent warning embed with dynamic countdown.");
  } catch (error) {
    console.error(`❌ Error in countdown script: ${error}`);
  } finally {
    db.end();
    client.destroy();
  }
});

client.login(process.env.CLIENT_BOT_TOKEN);
