import { Client, GatewayIntentBits, ChannelType } from "discord.js";
import dotenv from "dotenv";
import logger from "../logger.js";
import logError from "../utils/logError.js";

dotenv.config();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_ID = process.env.DISCORD_BOT_COMMANDS_CHANNEL_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const guilds = client.guilds.cache;

  for (const [guildId, guild] of guilds) {
    const fullGuild = await guild.fetch();
    const channels = await fullGuild.channels.fetch();

    const botCommandsChannel = channels.get(TARGET_CHANNEL_ID);

    if (
      !botCommandsChannel ||
      botCommandsChannel.type !== ChannelType.GuildText
    ) {
      logger.info(
        `⚠️ No valid text channel with ID '${TARGET_CHANNEL_ID}' found in ${guild.name}`
      );
      continue;
    }

    try {
      await botCommandsChannel.send({
        content: `📚 **Welcome to the Bot Commands Channel!**\n\nHere’s how you can interact with me:\n🔗 **/link <mc_name>** — Link your Minecraft name to your Discord account\n🕹️ **/playtime** — Check your own playtime\n🔍 **/playtime <mc_name>** — Check someone else's playtime\n🏆 **/top-playtime** — See the top 10 players with the most hours\n🧍 **/list** — Show who’s currently online on the Minecraft server\n🔑 **/token** — Generate a temporary chat token for [Createrington](<https://create-rington.com/>) (valid for 30 days)\n\n---\n\n⛏️ **Playtime Roles** — Level up by playing more on the server!\n\n🪨 **Stone** — 0–20 hours\n🥉 **Copper** — 20–40 hours\n⛓️ **Iron** — 40–60 hours\n🥇 **Gold** — 60–100 hours\n💎 **Diamond** — 100–200 hours\n🟥 **Crimson** — 200–300 hours\n⚪ **Silver** — 300–400 hours\n⚡ **Electrum** — 400–1000 hours\n👑 **Tyrian** — 1000+ hours\n\n🏆 **The Sleepless** — Awarded to the player with the most total playtime! (1st place only)\n\nGrind and show off your rank in Discord! 🎮\n\n---\n\n🖱️ **New! Try the Server Clicker Game**\nA fun browser-based clicker game is now live!\n▶️ Start here: [Createrington/game](<https://create-rington.com/discord-login>)\n**Make sure to log in with the same Discord account that’s in this server!**\n🚧 *The game is still in development — expect bugs and lots of new features in upcoming updates!*\n\n---\n\n💡 Need help? Just type **/** and scroll through available commands!`,
      });

      logger.info(
        `✅ Guide message sent to channel ID ${TARGET_CHANNEL_ID} in ${guild.name}`
      );
    } catch (error) {
      logger.error(
        `❌ Failed to send guide in ${guild.name}: ${logError(error)}`
      );
    }
  }

  client.destroy();
});

client.login(TOKEN);
