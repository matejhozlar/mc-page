import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID } = process.env;

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    const embed = new EmbedBuilder()
      .setTitle("🛠️ Createrington: Cogs & Steam v0.1.2 Modpack Update")
      .setColor(0x00b0f4)
      .setDescription(
        "A new version of the modpack is now available! Please update to **v0.1.2** to receive the latest improvements, fixes, and features."
      )
      .addFields(
        {
          name: "💰 Createrington Currency Mod",
          value: [
            "- Fixed an issue where player data would become invalid when rejoining singleplayer worlds.",
            "- Introduced the new **/vote** command.",
          ].join("\n"),
        },
        {
          name: "🗳️ Voting Revamp",
          value: [
            "Voting from within Minecraft has been reworked.",
            "",
            "New Syntax:",
            "```",
            "/vote <input>",
            "  - day      Start a vote to set the time to day",
            "  - night    Start a vote to set the time to night",
            "  - rain     Start a vote to set rain",
            "  - thunder  Start a vote to set thunder",
            "  - clear    Start a vote to clear the weather",
            "```",
          ].join("\n"),
        },
        {
          name: "⬆️ Updated Mods",
          value: [
            "- Stam1o Tweaks",
            "- Createrington Currency",
            "- Discord Integration",
          ].join("\n"),
        },
        {
          name: "🆕 New Mods",
          value: [
            "- Prone",
            "- MrCrayfish Furniture Mod (Refurbished)",
            "- Framework (Library)",
          ].join("\n"),
        },
        {
          name: "📢 Reminder",
          value:
            "Please update the modpack to the latest version.\nIf you encounter any issues or bugs, let the team know immediately!",
        }
      )
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("📣 Update announcement sent!");
  } catch (err) {
    console.error("❌ Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
