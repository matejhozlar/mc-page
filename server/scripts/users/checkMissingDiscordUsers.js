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

async function checkDiscordUserSync() {
  await db.connect();
  console.log("Connected to DB");

  await client.login(process.env.CLIENT_BOT_TOKEN);
  console.log(`Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const members = await guild.members.fetch();

  const result = await db.query(
    `SELECT name, discord_id FROM users WHERE discord_id IS NOT NULL`
  );

  const dbUsers = result.rows;
  const dbDiscordIds = new Set(dbUsers.map((user) => user.discord_id));
  const discordMembers = [...members.values()];
  const discordMemberIds = new Set(discordMembers.map((m) => m.id));

  const missingFromDiscord = dbUsers.filter(
    (user) => !discordMemberIds.has(user.discord_id)
  );

  const missingFromDB = discordMembers.filter(
    (member) => !dbDiscordIds.has(member.id) && !member.user.bot
  );

  if (missingFromDiscord.length === 0) {
    console.log("All DB users are in the Discord server.");
  } else {
    console.log("Users missing from Discord server:");
    missingFromDiscord.forEach((user) =>
      console.log(`- ${user.name} (Discord ID: ${user.discord_id})`)
    );
  }

  if (missingFromDB.length === 0) {
    console.log("All Discord members exist in the DB.");
  } else {
    console.log("Users in Discord but not in DB:");
    missingFromDB.forEach((member) =>
      console.log(`- ${member.user.tag} (Discord ID: ${member.id})`)
    );
  }

  await db.end();
  client.destroy();
}

checkDiscordUserSync();
