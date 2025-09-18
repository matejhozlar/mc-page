import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
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
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    const embed = new EmbedBuilder()
      .setTitle("🛠️ Createrington: Cogs & Steam v0.1.6a Modpack Update")
      .setColor(0x00b0f4)
      .setDescription(
        "A new version of the modpack is now available! Please update to **v0.1.6a** to receive the latest improvements, fixes, and features."
      )
      .addFields(
        {
          name: "⚙️ NeoForge Updated",
          value:
            "The NeoForge loader has been updated from **21.1.197** to **21.1.209** for improved stability and compatibility",
        },
        {
          name: "🆕 New Mods",
          value: ["- Granular Mob Griefing", "- Pretty in Pink"].join("\n"),
        },
        {
          name: "⬆️ Updated Mods",
          value: [
            "- Create Blocks & Bogies",
            "- Create Stuff and Additions",
            "- Create Better FPS",
            "- Create Central Kitchen",
            "- Create Dragons Plus",
            "- Create Enchantment Industry",
            "- Create Design and Decor",
            "- Create Dreams and Desires",
            "- Create Garnished",
            "- Create Gears and Kinetics",
            "- Create Trading Floor",
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
    console.log("Update announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
