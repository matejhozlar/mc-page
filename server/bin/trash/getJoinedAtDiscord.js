import { Client, GatewayIntentBits } from "discord.js";
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
db.connect();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const members = await guild.members.fetch();

    for (const member of members.values()) {
      if (member.user.bot) continue;

      const joinDate = member.joinedAt?.toISOString();
      if (!joinDate) continue;

      const res = await db.query(
        `UPDATE users
         SET first_joined = $1
         WHERE discord_id = $2
           AND (first_joined IS NULL OR first_joined > $1)`,
        [joinDate, member.id]
      );

      if (res.rowCount > 0) {
        console.log(`Updated: ${member.user.tag} (${member.id}) → ${joinDate}`);
      } else {
        console.log(
          `Skipped: ${member.user.tag} (${member.id}) — already set or no match`
        );
      }
    }

    console.log("Finished updating join dates.");
  } catch (error) {
    console.error("Error during update:", error);
  } finally {
    db.end();
    client.destroy();
  }
});

client.login(process.env.CLIENT_BOT_TOKEN);
