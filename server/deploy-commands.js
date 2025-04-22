import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const deleteOldCommand = async () => {
  const commands = await rest.get(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
  );

  const oldCommand = commands.find((cmd) => cmd.name === "gettoken");

  if (oldCommand) {
    await rest.delete(
      Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, oldCommand.id)
    );
    console.log("🗑️ Deleted old /gettoken command");
  }
};

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  new SlashCommandBuilder()
    .setName("token")
    .setDescription("Generate a temporary chat token")
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("📡 Registering slash command in GUILD:", GUILD_ID);
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Command registered:");
    console.log(data);
  } catch (err) {
    console.error("❌ Failed to register command:", err);
  }
})();
