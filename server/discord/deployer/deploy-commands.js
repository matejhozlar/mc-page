import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
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
