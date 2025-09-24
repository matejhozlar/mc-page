import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID } = process.env;

if (!CLIENT_BOT_TOKEN || !DISCORD_ANNOUNCEMENT_CHANNEL_ID) {
  console.error(
    "Missing CLIENT_BOT_TOKEN or DISCORD_ANNOUNCEMENT_CHANNEL_ID env vars."
  );
  process.exit(1);
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    if (!channel || !channel.isTextBased()) {
      throw new Error(
        "Provided channel is not text-based or could not be found."
      );
    }

    const deletedMods = ["- Create: Ender Link"].join("\n");
    const newMods = [
      "- Create: Bells and Whistles",
      "- Create: Ender Storage",
      "- Create: Escalated",
      "- Ender Storage",
      "- CodeChickenLib",
    ].join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🛠️ Createrington: Cogs & Steam v0.1.7 Modpack Update")
      .setColor(0x00b0f4)
      .setDescription(
        "A new version of the modpack is now available! Please update to **v0.1.7** to receive the latest improvements, fixes, and features."
      )
      .addFields(
        {
          name: "🆕 New Mods",
          value: newMods || "—",
        },
        {
          name: "🗑️ Deleted Mods",
          value: deletedMods || "—",
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
    console.log("Update announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
