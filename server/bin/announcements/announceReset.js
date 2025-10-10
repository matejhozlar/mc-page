import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_TEST_CHANNEL_ID } = process.env;

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(DISCORD_TEST_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("🌍 Server Update & Upcoming Reset")
      .setColor(0xf5a623)
      .setDescription(
        [
          "Hello everyone!",
          "",
          "Due to prolonged inactivity, we've taken the step to remove many inactive players from both the Discord and Minecraft servers. While this was inevitable, it's part of preparing for a new and improved experience.",
          "",
          "But don't worry, exciting things are on the horizon! A **new modpack** is currently in development, and a **full server reset** is planned soon. This reset will include a completely fresh world and a more refined modpack experience.",
          "",
          "This time, the focus will shift even more heavily toward **Create-based gameplay**, with **AE2 being removed** to simplify and enhance the core experience.",
          "",
          "🗓️ **Planned Reset:** This weekend (latest by Wednesday)",
          "",
          "📢 More updates and possible polls will follow soon to shape the future of the server together.",
          "",
          "📁 **Old World Download**: The previous world has been successfully uploaded to Google Drive and will be available for the next **2 months**. Please note the download size is approximately **40 GB**.",
          "",
          "🔗 Download Link: [Google Drive](https://drive.google.com/your-placeholder-link)",
        ].join("\n")
      )
      .setFooter({
        text: "Thank you for being part of the Createrington community!",
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
