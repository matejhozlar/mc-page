import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_LEADERBOARDS_CHANNEL_ID } = process.env;

const MESSAGE_ID_TO_EDIT = "1383941741773852806";

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_LEADERBOARDS_CHANNEL_ID
    );
    const message = await channel.messages.fetch(MESSAGE_ID_TO_EDIT);

    if (!message) {
      console.error("❌ Message not found.");
      return;
    }

    await message.edit({
      content: "",
      embeds: message.embeds,
      components: message.components,
    });

    console.log("Message content cleared successfully.");
  } catch (error) {
    console.error("Failed to edit message:", error);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
