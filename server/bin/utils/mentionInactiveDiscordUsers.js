import { Client, GatewayIntentBits } from "discord.js";
import pg from "pg";
import dotenv from "dotenv";
import logger from "../logger.js";
import logError from "./logError.js";

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
  logger.info(`Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const members = await guild.members.fetch();

    const dbResult = await db.query(`
      SELECT discord_id, name
      FROM users
      WHERE discord_id IS NOT NULL
        AND last_seen < NOW() - INTERVAL '21 days'
    `);

    if (dbResult.rows.length === 0) {
      logger.info("No inactive users found.");
      return;
    }

    const inactiveIds = dbResult.rows.map((r) => r.discord_id);
    const inactiveMembers = members.filter((member) =>
      inactiveIds.includes(member.id)
    );

    if (inactiveMembers.size === 0) {
      logger.info("No matching Discord members for inactive users.");
      return;
    }

    const channel = await guild.channels.fetch(
      process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    const mentionList = Array.from(inactiveMembers.values())
      .map((member) => `<@${member.id}>`)
      .join(" ");

    const message = `👋 Hey folks! Just a quick heads-up — it's been over **3 weeks** since the following players last logged in:\n\n${mentionList}\n\nNo pressure at all, but if you're still planning to play, just drop me a quick message so I know you're around. And if you're done for now, that's totally fine too — just let me know so I can free up space for others. Thanks! 🙏`;

    await channel.send(message);
    logger.info("Sent inactivity reminder.");
  } catch (error) {
    logger.error(`Error during inactive user check: ${logError(error)}`);
  } finally {
    db.end();
    client.destroy();
  }
});

client.login(process.env.CLIENT_BOT_TOKEN);
