import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import config from "../../config/index.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { BLUE } = config.uiColors;

const {
  CLIENT_BOT_TOKEN,
  DISCORD_ANNOUNCEMENT_CHANNEL_ID: publishChannel,
  DISCORD_TICKET_MESSAGE_CHANNEL_ID: ticketChannelId,
} = process.env;

if (!CLIENT_BOT_TOKEN || !publishChannel || !ticketChannelId) {
  console.error(
    "Missing one or more env vars: CLIENT_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID, DISCORD_TICKET_MESSAGE_CHANNEL_ID."
  );
  process.exit(1);
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(publishChannel);

    if (!channel || !channel.isTextBased()) {
      throw new Error(
        "Provided channel is not text-based or could not be found."
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("👋 We’re recruiting an Admin")
      .setColor(BLUE)
      .setDescription(
        [
          "Hello everyone!",
          "",
          "We’re looking for a friendly, reliable **Admin** to help us keep the server running smoothly and support our players.",
          "Our ideal teammate communicates clearly, makes fair decisions, and enjoys building a welcoming community.",
        ].join("\n")
      )
      .addFields(
        {
          name: "🧭 Timezone",
          value:
            "We **prefer** someone who can cover **US time zones**, but it’s **not required**. Passion and consistency matter most.",
        },
        {
          name: "📨 How to apply",
          value:
            `Please **open a new support ticket** in ${`<#${ticketChannelId}>`}.\n` +
            "Include:\n" +
            "• Your timezone and typical availability\n" +
            "• A short note on why you’d be a great fit",
        },
        {
          name: "🤝 Thank you",
          value:
            "We appreciate everyone who takes the time to apply. Even if you’re unsure, we’d love to hear from you!",
        }
      )
      .setFooter({
        text: "Thanks for playing on Createrington!",
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Admin recruitment announcement sent!");
  } catch (error) {
    console.error("Failed to send recruitment announcement:", error);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
