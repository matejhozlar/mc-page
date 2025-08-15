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
      .setTitle("🛠️ Createrington: Cogs & Steam v0.1.5 Modpack Update")
      .setColor(0x00b0f4)
      .setDescription(
        "A new version of the modpack is now available! Please update to **v0.1.5** to receive the latest improvements, fixes, and features."
      )
      .addFields(
        {
          name: "⬆️ Updated Mods",
          value: ["- AFKStatus"].join("\n"),
        },
        {
          name: "🆕 New Mods",
          value: [
            "- Create: Ender Link",
            "- Create: GnKinetics",
            "- Create: Sophisticated Backpacks Integration",
            "- Double Doors",
            "- Observable",
            "- Measurements",
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
