import { Client, GatewayIntentBits, ChannelType } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_NAME = "bot-commands";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const guilds = client.guilds.cache;

  for (const [guildId, guild] of guilds) {
    const fullGuild = await guild.fetch();
    const channels = await fullGuild.channels.fetch();

    const botCommandsChannel = channels.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.name === TARGET_CHANNEL_NAME
    );

    if (!botCommandsChannel) {
      console.log(
        `⚠️ No channel named '${TARGET_CHANNEL_NAME}' found in ${guild.name}`
      );
      continue;
    }

    try {
      await botCommandsChannel.send({
        content: `📚 **Welcome to the Bot Commands Channel!**\n\nHere’s how you can interact with me:\n
🔗 **/link <mc_name>** — Link your Minecraft name to your Discord account  
🕹️ **/playtime** — Check your own playtime  
🔍 **/playtime <username>** — Check someone else's playtime  
🏆 **/top-playtime** — See the top 10 players with the most hours  
🔑 **/token** — Generate a temporary chat token (valid for 30 days)\n
💡 Need help? Just type **/** and scroll through available commands!`,
      });

      console.log(
        `✅ Guide message sent to #${TARGET_CHANNEL_NAME} in ${guild.name}`
      );
    } catch (err) {
      console.error(`❌ Failed to send guide in ${guild.name}:`, err);
    }
  }

  client.destroy();
});

client.login(TOKEN);
