import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const {
  CLIENT_BOT_TOKEN,
  DISCORD_MARKET_CHANNEL_ID,
  DISCORD_ANNOUNCEMENT_CHANNEL_ID,
} = process.env;

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const embed = new EmbedBuilder()
    .setTitle("🏢 Createrington Market – Version 1.0 Released!")
    .setColor(0x00a86b)
    .setDescription(
      [
        "🎉 **The Market system is officially live in Early Access!**",
        "You can now create companies, manage funds, and earn hourly interest.",
        "This is **Version 1.0**, so expect bugs, balance tweaks, and more features soon.",
        "",
        `📌 **Join the discussion and read the full guide in <#${DISCORD_MARKET_CHANNEL_ID}>**`,
      ].join("\n\n")
    )
    .addFields(
      {
        name: "🚀 What's New",
        value: [
          "• Company creation & editing with review system",
          "• Company funds with deposit/withdraw",
          "• Hourly interest for qualifying companies",
          "• Gallery, logo, and banner support",
        ].join("\n"),
      },
      {
        name: "⚠️ Early Access Notice",
        value: [
          "• Features are incomplete and may change without warning",
          "• Economy values will be monitored and adjusted",
          "• Please report bugs by creating a ticket",
        ].join("\n"),
      }
    )
    .setFooter({ text: "Thanks for playing on Createrington!" })
    .setTimestamp();

  try {
    const announcementChannel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );
    await announcementChannel.send({ embeds: [embed] });
    console.log("📢 Announcement sent!");
  } catch (err) {
    console.error("❌ Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
