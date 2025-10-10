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
  console.log(`Logged in as ${client.user.tag}`);

  const embed = new EmbedBuilder()
    .setTitle("🏢 Createrington Market – Version 1.1 Update")
    .setColor(0x00a86b)
    .setDescription(
      [
        "🎉 **Market v1.1 is here!**",
        "We’ve expanded the economy with **Shops**, improved search, and polished reviews.",
        "As always, this is still **Early Access** — expect changes and tweaks as we go.",
        "",
        `📌 **Full guide and info in <#${DISCORD_MARKET_CHANNEL_ID}>**`,
      ].join("\n\n")
    )
    .addFields(
      {
        name: "🚀 What's New",
        value: [
          "• **Shops** – Founders can now create and manage shops *(limited access during rollout)*",
          "• Shop creation & approval process works similar to companies",
          "• Add items with name, price, description, and status control",
          "• **Marketplace tab** – Browse or search all public shop items",
          "• Soft substring search for item names (typo-friendly)",
          "• **Ratings & Reviews** for shops – 1–5 stars + optional comment, 1 review per shop/user",
          "• Company pages now show the **average rating** across all their shops",
        ].join("\n"),
      },
      {
        name: "⚠️ Early Access Notice",
        value: [
          "• Features are incomplete and may change without warning",
          "• Balance, shop limits, and economy values will be monitored and adjusted",
          "• Bugs happen — please report them in tickets with steps/screenshots",
        ].join("\n"),
      }
    )
    .setFooter({ text: "Thanks for building the Market with us!" })
    .setTimestamp();

  try {
    const announcementChannel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );
    await announcementChannel.send({ embeds: [embed] });
    console.log("v1.1 Announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
