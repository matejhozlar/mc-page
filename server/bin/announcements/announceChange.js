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
      .setTitle("💼 Createrington Market Rebranded to Crypto!")
      .setColor(0x00b0f4)
      .setDescription(
        "We've officially **rebranded** the Createrington Market to **Createrington Crypto** in preparation for upcoming updates and features!"
      )
      .addFields(
        {
          name: "🔁 What Changed?",
          value: [
            "- All references to **Market** have been renamed to **Crypto**",
            "- Discord commands like `/market` are now `/crypto`",
            "- In-game and website UI now reflect the new name",
          ].join("\n"),
        },
        {
          name: "📈 Price Updates",
          value:
            "Token prices on the website are now **more accurate and update live**, improving your trading experience.",
        },
        {
          name: "🧠 Functionality",
          value:
            "Everything works just as it did before — same tokens, same trading system, just a **fresh new identity**.",
        },
        {
          name: "🚀 What’s Next?",
          value:
            "Stay tuned for **new features**, gameplay integrations, and more crypto-focused updates coming soon.",
        }
      )
      .setFooter({
        text: "Thanks for playing on Createrington!",
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Rebrand announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
