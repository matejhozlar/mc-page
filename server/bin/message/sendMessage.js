import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

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
      .setTitle("📢 Sifter Changes")
      .setColor(0xff7f50)
      .addFields(
        {
          name: "🔧 Changes Implemented",
          value:
            `Crush Deepslate ➔ **Cobbled Deepslate**\n` +
            `Crush Cobbled Deepslate ➔ **Crushed Deepslate**\n` +
            `Sifter it with sturdy Meshes ➔ **Tuff Pebble**\n` +
            `Compact Tuff Pebble ➔ **Tuff**\n`,
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

client.login(process.env.CLIENT_BOT_TOKEN);
