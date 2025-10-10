import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const DISCORD_TOKEN = process.env.CLIENT_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_LEADERBOARDS_CHANNEL_ID;

client.once("ready", async () => {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) {
      throw new Error("Channel is not a text channel");
    }

    await channel.send("📊 market_leaderboard placeholder");
    console.log("Placeholder message sent.");
  } catch (err) {
    console.error("Failed to send message:", err);
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
