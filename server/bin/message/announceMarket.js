import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const ANNOUNCEMENT_CHANNEL_ID = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID;
const PLAYER_ROLE_ID = process.env.DISCORD_PLAYER_ROLE_ID;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
    if (!channel.isTextBased()) {
      console.error("Channel is not text-based!");
      process.exit(1);
    }

    const embed = new EmbedBuilder()
      .setTitle("🪙 New Crypto Market is Live!")
      .setColor(0x00aeff)
      .setDescription(
        "The **Createrington Crypto Market** is now open! Trade tokens, check live prices, and grow your wealth directly from your Minecraft balance."
      )
      .addFields(
        {
          name: "🔗 Get Started",
          value:
            "[Visit the Market](https://create-rington.com/market) to begin trading.",
        },
        {
          name: "📈 Live Prices",
          value:
            "- Prices update every **x seconds** based on player activity and server health.\n" +
            "- Track price history with **1h, 24h, 7d, 30d** charts.",
        },
        {
          name: "💡 Tips",
          value:
            "- Use `/money` in-game to check your balance.\n" +
            "- Look for dips to buy low, then sell high!",
        }
      )
      .setFooter({ text: "Happy trading on Createrington!" })
      .setTimestamp();

    await channel.send({
      content: `<@&${PLAYER_ROLE_ID}>`,
      embeds: [embed],
    });

    console.log("Crypto market announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.CLIENT_BOT_TOKEN);
