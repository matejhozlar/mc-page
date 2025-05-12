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
        content: `📚 **Welcome to the Bot Commands Channel!**

Here’s how you can interact with me:
🔗 **/link <mc_name>** — Link your Minecraft name to your Discord account  
🕹️ **/playtime** — Check your own playtime  
🔍 **/playtime <mc_name>** — Check someone else's playtime  
🏆 **/top-playtime** — See the top 10 players with the most hours  
🧍 **/list** — Show who’s currently online on the Minecraft server  
🔑 **/token** — Generate a temporary chat token for [Createrington](<https://create-rington.com/>) (valid for 30 days)

---

⛏️ **Playtime Roles** — Level up by playing more on the server!\n
🪨 **Stone** — 0–20 hours  
🥉 **Copper** — 20–40 hours  
⛓️ **Iron** — 40–60 hours  
🥇 **Gold** — 60–100 hours  
💎 **Diamond** — 100–200 hours  
🟥 **Crimson** — 200–300 hours  
⚪ **Silver** — 300–400 hours  
⚡ **Electrum** — 400–1000 hours  
👑 **Tyrian** — 1000+ hours  

🏆 **The Sleepless** — Awarded to the player with the most total playtime! (1st place only)

Grind and show off your rank in Discord! 🎮

---

🖱️ **New! Try the Server Clicker Game**  
A fun browser-based clicker game is now live! 
▶️ Start here: [Createrington/game](<https://create-rington.com/discord-login>)  
**Make sure to log in with the same Discord account that’s in this server!**  
🚧 *The game is still in development — expect bugs and lots of new features in upcoming updates!*

---

💡 Need help? Just type **/** and scroll through available commands!`,
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
