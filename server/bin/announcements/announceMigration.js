import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID } = process.env;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID,
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Migrate")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/mtF6MDHj4Z"),
    );

    await channel.send({
      content:
        "<@&1226525317800132719>\n\n" +
        "# Createrington is Moving!\n\n" +
        "We're migrating to a **brand new Discord server** with a fresh setup, better organization, and new features.\n\n" +
        "**Why?**\n" +
        "Due to Discord limitations, a fresh server was the only way to properly restructure and set things up the way we needed.\n\n" +
        "**What's carrying over?**\n" +
        "- Your balance, playtime, stats, and leaderboard data\n" +
        "- Server IP and modpack remain the same\n" +
        "- Website stays at **create-rington.com**\n" +
        "- You don't need to re-verify on the new server\n\n" +
        "**What's changing?**\n" +
        "- Companies have been removed — all crypto and company funds were transferred to your balances\n" +
        "- RGC token has been reset and starts fresh at **$1.00**\n" +
        "- Overhauled website and Discord server\n" +
        "- Createrington currency system update\n\n" +
        "If you encounter any bugs or issues, please report them as soon as possible!\n\n" +
        "This server will be archived and eventually shut down. Click the button below to join the new server!",
      components: [row],
    });

    console.log("Migration announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
