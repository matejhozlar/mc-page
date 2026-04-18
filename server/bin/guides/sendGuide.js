import {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.CLIENT_BOT_TOKEN;
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
      console.log(
        `No valid text channel with ID '${TARGET_CHANNEL_ID}' found in ${guild.name}`,
      );
      continue;
    }

    const embed = new EmbedBuilder()
      .setTitle("📚 Welcome to the Bot Commands Channel!")
      .setDescription(
        `Custom Minecraft commands:\n` +
          `**/vote**\n` +
          `☀️ **day** — Starts a voting process for /time set day\n` +
          `🌙 **night** — Starts a voting process for /time set night\n` +
          `🌧️ **rain** — Starts a voting process for /weather rain\n` +
          `⚡ **thunder** — Starts a voting process for /weather thunder\n` +
          `🌤️ **clear** — Starts a voting process for /weather clear\n\n` +
          `Createrington Currency mod commands (DC & MC):\n` +
          `💰 **/money** — Check your balance\n` +
          `💸 **/pay** — Send money to a player\n` +
          `🎲 **/lottery <amount>** — Start a lottery (min $10)\n` +
          `🤑 **/join <amount>** — Join the ongoing lottery (min $10)\n` +
          `🏦 **/baltop** — See the top 10 richest players\n` +
          `🎁 **/daily** — Claim your daily reward\n\n` +
          `Createrington Crypto commands (DC):\n` +
          `💲 **/crypto buy <symbol> <amount>** — Buy a crypto token\n` +
          `💱 **/crypto sell <symbol> <amount>** — Sell a crypto token\n` +
          `🪙 **/crypto-token <symbol>** — Check live prices and charts for a specific token\n` +
          `💼 **/crypto-portfolio** — View your portfolio\n` +
          `🔍 **/crypto-portfolio <name>** — View someone’s public portfolio\n` +
          `🔔 **/crypto-alert <symbol> <price> <direction>** — Get notified when a token reaches a price\n` +
          `❌ **/crypto-alert-remove <symbol>** — Remove a price alert for a token\n` +
          `📋 **/crypto-alert-list** — View all your active price alerts\n` +
          `More crypto commands coming soon to both Discord and Minecraft!\n\n` +
          `Here’s how you can interact with me:\n` +
          `🌐 **/ip** — Get the Createrington Server IP\n` +
          `🗺️ **/map** — View the web server map\n` +
          `🧩 **/modpack** — Get the Createrington server modpack\n` +
          `👤 **/profile** — See general info about your Createrington profile\n` +
          `📈 **/stats** — View top 5 players for any specific Minecraft stat\n` +
          `ℹ️ **/stats-info** — A list of all current stat types and keys\n` +
          `📘 **/stats-guide** — Learn how to use /stats with images and examples\n` +
          `👑 **/stats-champions** — See who has the most 1st-place finishes across all stats\n` +
          `🎖️ **/stats-crowns** — See how many stats you're ranked #1 in — and export them\n` +
          `🔍 **/stats-crowns <mc_name>** — Check another player’s #1 stat ranks\n` +
          `🔗 **/link <mc_name>** — Link your Minecraft name to your Discord account\n` +
          `🕹️ **/playtime** — Check your own playtime\n` +
          `🔍 **/playtime <mc_name>** — Check someone else's playtime\n` +
          `🏦 **/server-currency** — Check the total currency circulation of Createrington\n` +
          `🕒 **/server-playtime** — Check the total combined playtime of all players\n` +
          `🏆 **/top-playtime** — See the top 10 players with the most hours\n` +
          `🧍 **/list** — Show who’s currently online on the Minecraft Server\n` +
          `🔑 **/token** — Generate a web chat token for [Createrington](https://createrington.com/) (30 days)\n\n` +
          `⛏️ **Playtime Roles** — Level up by playing more on the server!\n` +
          `🪨 Stone — 0–20h\n🥉 Copper — 20–40h\n⛓️ Iron — 40–60h\n🥇 Gold — 60–100h\n` +
          `💎 Diamond — 100–200h\n🟥 Crimson — 200–300h\n⚪ Silver — 300–400h\n` +
          `⚡ Electrum — 400–1000h\n🔮 Tyrian — 1000+ hours\n\n` +
          `🕒 **Membership Duration Roles** — Show off how long you've been with us!\n` +
          `👶 **Newcomer** (0–30 days) — Welcome to the community!\n` +
          `🧭 **Adventurer** (31–90 days) — You're exploring and settling in.\n` +
          `🛡️ **Regular** (91–180 days) — A familiar face and valued member.\n` +
          `🏅 **Veteran** (181–365 days) — You've been here through thick and thin.\n` +
          `🌟 **Legend** (1+ year) — A true pillar of the community!\n\n` +
          `🏆 **The Sleepless** — Awarded to the player with the most total playtime!\n` +
          `👑 **One Above All** — Awarded to the player with most 1st-place stat finishes!\n\n` +
          `🎮 Grind and show off your rank in Discord!\n\n` +
          `🖱️ **New! Server Clicker Game** — ▶️ [Play here](https://createrington.com/discord-login)\n` +
          `A fun browser-based clicker game is now live!\n` +
          `**Log in with the same Discord account that's in this server!**\n` +
          `🚧 *The game is still in development — expect bugs and lots of new features in upcoming updates!*\n\n` +
          `💡 Need help? Type **/** and scroll through available commands.`,
      )
      .setColor(0x5865f2);

    try {
      await botCommandsChannel.send({ embeds: [embed] });

      console.log(
        `Guide message sent to channel ID ${TARGET_CHANNEL_ID} in ${guild.name}`,
      );
    } catch (error) {
      console.error(`Failed to send guide in ${guild.name}:`, error);
    }
  }

  client.destroy();
  process.exit(0);
});

client.login(TOKEN);
