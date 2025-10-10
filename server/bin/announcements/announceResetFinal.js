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
      .setTitle(
        "🚨 Server Reset is Live! Welcome to Createrington: Cogs & Steam"
      )
      .setColor(0x4caf50)
      .setDescription(
        [
          "Hey everyone! The wait is over — the full server reset is now **LIVE**! 🌍",
          "",
          "Say hello to our brand new custom modpack: **Createrington: Cogs & Steam** ⚙️💨",
          "",
          "**🆕 What's New?**",
          "- Brand new **Create-focused** gameplay experience, built around **Create v6.0.6**",
          "- **AE2 has been removed** to streamline and focus the gameplay loop",
          "- Vastly improved performance and optimization across both **Minecraft** and the **Web**",
          "",
          "**🌐 Enhanced Web & Community Features**",
          "- 🗺️ **Interactive Web Map** with real-time player tracking: [Map](https://createrington.com/blue-map)",
          "- 💬 Fully integrated **cross-platform chat**: [Chat](https://createrington.com/server-chat)",
          "- ⚙️ Better overall integration between **Minecraft, Discord, and the Web**",
          "",
          "**📈 Roadmap – What’s Coming Soon?**",
          "- ✨ New and improved **Discord commands**",
          "- 🔗 Smoother, deeper integration across all platforms",
          "- 🪙 New **crypto market features** including **player-created tokens**",
          "",
          "⬇️ **Old World Download** is still available for the next 2 months (~40 GB):",
          "[Google Drive](https://drive.google.com/file/d/1RhAZ4_9kGEl8qvKtc8EAf_H4q5cuYuq9/view?usp=drive_link)",
          "",
          "Thank you for sticking with us, and welcome to the next era of Createrington!",
        ].join("\n")
      )
      .setFooter({
        text: "Let's get building! – The Createrington Team",
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Server reset announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
