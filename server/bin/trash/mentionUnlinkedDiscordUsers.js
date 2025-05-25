import { Client, GatewayIntentBits } from "discord.js";
import pg from "pg";
import logger from "../logger.js";
import logError from "../utils/logError.js";
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
  logger.info(`🟢 Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const members = await guild.members.fetch();

    const dbResult = await db.query(
      `SELECT discord_id FROM users WHERE discord_id IS NOT NULL`
    );
    const knownIds = dbResult.rows.map((r) => r.discord_id);

    const unlinkedMembers = members.filter(
      (member) => !member.user.bot && !knownIds.includes(member.id)
    );

    if (unlinkedMembers.size === 0) {
      logger.info("✅ All members are already linked.");
      return;
    }

    const channel = await guild.channels.fetch(
      process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );
    const mentionList = Array.from(unlinkedMembers.values())
      .map((member) => `<@${member.id}>`)
      .join(" ");

    const message = `📢 The following members are currently **not linked** to a Minecraft account in our system:\n\n${mentionList}\n 🕒 You have **3 days** to let me know if you plan to join or are still interested in playing.\n I'm managing limited player slots, so unlinked accounts may be removed to make space for new players.\n Reach out if you need help linking your account.\n *If you are active and already playing, feel free to ignore this message and sorry for the uneccessary mention.*`;

    await channel.send(message);
    logger.info("📨 Sent notification for unlinked members.");
  } catch (error) {
    logger.error(`❌ Failed to check and notify: ${logError(error)}`);
  } finally {
    db.end();
    client.destroy();
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
