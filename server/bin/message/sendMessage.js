import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Replace these with your actual IDs
const ANNOUNCEMENT_CHANNEL_ID = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID;
const AGENT_USER_ID = "547450242090532874";
const PLAYER_ROLE_ID = process.env.DISCORD_PLAYER_ROLE_ID;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);

    if (!channel.isTextBased()) {
      console.error("Channel is not text based!");
      process.exit(1);
    }

    const embed = new EmbedBuilder()
      .setTitle("📢 Sifter Nerf Update")
      .setColor(0xff7f50)
      .setDescription(
        `🗳️ As per our poll:\n**14 voted for nerf/removal vs 10 against.**`
      )
      .addFields(
        {
          name: "🔧 Changes Implemented",
          value:
            `Crushed Basalt ➔ now made from **Smooth Basalt**\n` +
            `**Netherite** & **Diamonds** no longer obtainable via sifting\n` +
            `**Gold** now requires **Red Sand**\n` +
            `**Gravel** improved odds for:\n` +
            `- Iron\n` +
            `- Copper\n` +
            `- Zinc`,
        },
        {
          name: "💬 Complaints?",
          value: `Go cry to <@${AGENT_USER_ID}> — but he probably won't give a **** 😈`,
        }
      )
      .setTimestamp();

    await channel.send({
      content: `<@&${PLAYER_ROLE_ID}>`,
      embeds: [embed],
    });

    console.log("✅ Announcement sent!");
  } catch (err) {
    console.error("❌ Failed to send message:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
