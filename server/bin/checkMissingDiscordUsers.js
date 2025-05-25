import dotenv from "dotenv";
import pg from "pg";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

async function checkMissingDiscordUsers() {
  await db.connect();
  console.log("✅ Connected to DB");

  await client.login(process.env.DISCORD_BOT_TOKEN);
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const members = await guild.members.fetch();

  const result = await db.query(
    `SELECT name, discord_id FROM users WHERE discord_id IS NOT NULL`
  );

  const dbUsers = result.rows;
  const discordMemberIds = new Set(members.map((m) => m.id));

  const missing = dbUsers.filter(
    (user) => !discordMemberIds.has(user.discord_id)
  );

  if (missing.length === 0) {
    console.log("✅ All DB users are in the Discord server.");
  } else {
    console.log("🚫 Missing users:");
    missing.forEach((user) =>
      console.log(`- ${user.name} (Discord ID: ${user.discord_id})`)
    );
  }

  await db.end();
  client.destroy();
}

checkMissingDiscordUsers();
