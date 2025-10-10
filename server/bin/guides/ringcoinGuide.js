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
      .setTitle("🪙 Introducing Ringcoin (RGC)")
      .setColor(0xffcb05)
      .setDescription(
        "Meet **Ringcoin (RGC)** — the first stablecoin on Createrington! Its price is automatically updated every **10 minutes** based on player activity, overall playtime, and the health of the Createrington server."
      )
      .addFields(
        { name: "Symbol", value: "RGC", inline: true },
        { name: "Starting Price", value: "$1.00", inline: true },
        { name: "Total Supply", value: "1,000,000", inline: true },
        {
          name: "Utility",
          value:
            "The default utility token of Createrington. Invest into the server player activity driven token!",
        },
        {
          name: "Price Updates",
          value:
            "🔄 Updates every **10 minutes** to reflect live server metrics and ensure stability.",
        }
      )
      .setFooter({ text: "Happy trading on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Ringcoin announcement sent!");
  } catch (err) {
    console.error("Failed to send Ringcoin announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
