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
      .setTitle("🛠️ Createrington: Cogs & Steam v0.1.4 Modpack Update")
      .setColor(0x00b0f4)
      .setDescription(
        "A new version of the modpack is now available! Please update to **v0.1.4** to receive the latest improvements, fixes, and features."
      )
      .addFields(
        {
          name: "⚙️ NeoForge Updated",
          value:
            "The NeoForge loader has been updated from **21.1.194** to **21.1.197** for improved stability and mod compatibility.",
        },
        {
          name: "🆕 New Mods",
          value: [
            "- Sophisticated Storage",
            "- Sophisticated Storage Create Integration",
            "- Create: Blocks & Bogies",
            "- Delivery Director",
            "- Athena (Library)",
            "- AFKStatus",
            "- Chipped",
            " Caelus API",
            "- Elytra slot (Curious)",
          ].join("\n"),
        },
        {
          name: "⬆️ Updated Mods",
          value: "- Createrington Currency (bug & config fixes)",
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
