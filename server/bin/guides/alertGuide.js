import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_CURRENCY_CHANNEL_ID } = process.env;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(DISCORD_CURRENCY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("🔔 Crypto Alert System")
      .setColor(0xffcb05)
      .setDescription(
        "Get notified when your favorite tokens hit your target price — powered by **Createrington Bot**!\n\n" +
          "You’ll receive alerts **directly through Discord DMs** from the bot, so make sure your DMs are open."
      )
      .addFields(
        {
          name: "/crypto-alert",
          value:
            "Set a price alert for a token (e.g. `RGC` at `$0.25` optional: `Above`/`Below`). You’ll get a DM when the price is hit.",
        },
        {
          name: "/crypto-alert-remove",
          value: "Remove an alert for a specific token.",
        },
        {
          name: "/crypto-alert-list",
          value: "View all of your currently active alerts.",
        },
        {
          name: "Auto-unsubscribe",
          value:
            "Once the alert is triggered, you will be automatically unsubscribed from that token alert.",
        }
      )
      .setFooter({ text: "Trade smarter with alerts from Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Crypto alert guide sent!");
  } catch (error) {
    console.error("Failed to send Crypto alert guide:", error);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
