import {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
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

    const embed = new EmbedBuilder()
      .setTitle("📚 Welcome to the Bot Commands Channel!")
      .setDescription(
        `Custom Minecraft commands:\n` +
          `☀️ **.day** — Starts a voting process for /time set day\n` +
          `🌧️ **.rain** — Starts a voting process for /weather rain\n` +
          `⚡ **.thunder** — Starts a voting process for /weather thunder\n` +
          `🌤️ **.clear** — Starts a voting process for /weather clear\n\n` +
          `Here’s how you can interact with me:\n` +
          `🌐 **/ip** — Get the Createrington Server IP\n` +
          `🗺️ **/map** — View the web server map\n` +
          `🧩 **/modpack** — Get the Createrington server modpack\n` +
          `📈 **/stats** — View top 5 players for any specific Minecraft stat\n` +
          `ℹ️ **/stats-info** — A list of all current stat types and keys\n` +
          `📘 **/stats-guide** — Learn how to use /stats with images and examples\n` +
          `👑 **/stats-champions** — See who has the most 1st-place finishes across all stats\n` +
          `🎖️ **/stats-crowns** — See how many stats you're ranked #1 in — and export them\n` +
          `🔎 **/stats-crowns <mc_name>** — Check another player’s #1 stat ranks\n` +
          `🔗 **/link <mc_name>** — Link your Minecraft name to your Discord account\n` +
          `🕹️ **/playtime** — Check your own playtime\n` +
          `🔍 **/playtime <mc_name>** — Check someone else's playtime\n` +
          `🕒 **/server-playtime** — Check the total combined playtime of all players\n` +
          `🏆 **/top-playtime** — See the top 10 players with the most hours\n` +
          `🧍 **/list** — Show who’s currently online on the Minecraft Server\n` +
          `🔑 **/token** — Generate a web chat token for [Createrington](https://create-rington.com/) (30 days)\n\n` +
          `⛏️ **Playtime Roles** — Level up by playing more on the server!\n` +
          `🪨 Stone — 0–20h\n🥉 Copper — 20–40h\n⛓️ Iron — 40–60h\n🥇 Gold — 60–100h\n` +
          `💎 Diamond — 100–200h\n🟥 Crimson — 200–300h\n⚪ Silver — 300–400h\n` +
          `⚡ Electrum — 400–1000h\n🔮 Tyrian — 1000+ hours\n\n` +
          `🏆 **The Sleepless** — Awarded to the player with the most total playtime!\n` +
          `👑 **One Above All** — Awarded to the player with most 1st-place stat finishes!\n\n` +
          `🎮 Grind and show off your rank in Discord!\n\n` +
          `🖱️ **New! Server Clicker Game** — ▶️ [Play here](https://create-rington.com/discord-login)\n` +
          `A fun browser-based clicker game is now live!\n` +
          `**Log in with the same Discord account that's in this server!**\n` +
          `🚧 *The game is still in development — expect bugs and lots of new features in upcoming updates!*\n\n` +
          `💡 Need help? Type **/** and scroll through available commands.`
      )
      .setColor(0x5865f2);

    try {
      await botCommandsChannel.send({ embeds: [embed] });

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
  process.exit(0);
});

client.login(TOKEN);
