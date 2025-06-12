import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  new SlashCommandBuilder()
    .setName("market-token")
    .setDescription("Generate a market token chart screenshot")
    .addStringOption((option) =>
      option
        .setName("symbol")
        .setDescription("Enter the token symbol (e.g., MOO, BTC, ETH)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward"),
  new SlashCommandBuilder()
    .setName("baltop")
    .setDescription("Show top 10 richest players"),
  new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Pay another player from your balance")
    .addStringOption((option) =>
      option
        .setName("recipient")
        .setDescription("The recipient's Discord mention or Minecraft username")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount to send")
        .setRequired(true)
        .setMinValue(1)
    ),
  new SlashCommandBuilder()
    .setName("money")
    .setDescription("Check your current balance"),
  new SlashCommandBuilder()
    .setName("modpack")
    .setDescription("Get the modpack for Createrington server"),
  new SlashCommandBuilder()
    .setName("server-playtime")
    .setDescription(
      "Show the total combined playtime of all players on the server"
    ),
  new SlashCommandBuilder()
    .setName("stats-crowns")
    .setDescription(
      "View how many stats you're 1st place in — and export the details!"
    )
    .addStringOption((option) =>
      option
        .setName("mc_name")
        .setDescription("Minecraft username to check (optional)")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("stats-guide")
    .setDescription("Learn how to use the /stats command with examples"),
  new SlashCommandBuilder()
    .setName("stats-category")
    .setDescription("Show the top players for a given Minecraft stat category")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The stat category (e.g., mined, killed, crafted)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("stats-champions")
    .setDescription(
      "Show players with the most 1st-places across all Minecraft stats"
    ),
  new SlashCommandBuilder()
    .setName("stats-info")
    .setDescription(
      "Export all known Minecraft stat categories and keys (once per 24h)"
    ),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show the top 5 players for a specific Minecraft stat")
    .addStringOption((option) =>
      option
        .setName("stat_type")
        .setDescription("The stat category (e.g., mined, killed, custom)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("stat_key")
        .setDescription(
          "The specific Minecraft stat key (e.g., minecraft:stone)"
        )
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("map")
    .setDescription("View the live server map for Createrington"),
  new SlashCommandBuilder()
    .setName("ip")
    .setDescription("Get the Createrington IP"),
  new SlashCommandBuilder()
    .setName("list")
    .setDescription("Show currently online players on the Minecraft server"),
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify your token")
    .addStringOption((option) =>
      option
        .setName("token")
        .setDescription("Verification token from email invite")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register to the Server")
    .addStringOption((option) =>
      option
        .setName("mc_name")
        .setDescription("Your exact Minecraft username (case doesn't matter)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("top-playtime")
    .setDescription("Check top 10 players"),
  new SlashCommandBuilder()
    .setName("playtime")
    .setDescription("Check your own or another player's playtime")
    .addStringOption((option) =>
      option
        .setName("mc_name")
        .setDescription("Minecraft username (optional)")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("token")
    .setDescription("Generate a temporary chat token"),

  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link your Minecraft name to your Discord account")
    .addStringOption((option) =>
      option
        .setName("mc_name")
        .setDescription("Your Minecraft username")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("setup-ticket")
    .setDescription("Send the ticket creation message (admin only)")
    .setDefaultMemberPermissions(0),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("📡 Registering slash commands in GUILD:", GUILD_ID);
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Commands registered:");
    data.forEach((cmd) => console.log(` - /${cmd.name}`));
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
})();
