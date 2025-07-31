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

async function updateNicknamesWithMCNames() {
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

  for (const user of dbUsers) {
    try {
      const member = members.get(user.discord_id);
      if (!member) {
        console.warn(`Discord member not found: ${user.discord_id}`);
        continue;
      }

      const currentNickname = member.nickname || member.user.username;
      const newNickname = `${currentNickname} (${user.name})`;

      if (currentNickname != newNickname) {
        await member.setNickname(newNickname);
        console.log(
          `Updated nickname for ${member.user.tag} -> ${newNickname}`
        );
      }
    } catch (error) {
      console.log(`Failed to update nickname for ${user.discord_id}`, error);
    }
  }

  await db.end();
  client.destroy();
  console.log("Script finished and cleaned up");
  process.exit(0);
}

updateNicknamesWithMCNames();
