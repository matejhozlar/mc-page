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
      .setTitle("🪙 Introducing PulseCoin (PLC)")
      .setColor(0xffcb05)
      .setDescription(
        "**PLC** is an exclusive reward token earned by completing **daily shared quests** on Createrington. Your effort fuels your earnings — and the value of PLC grows with community participation!"
      )
      .addFields(
        { name: "Symbol", value: "PLC", inline: true },
        { name: "Starting Price", value: "$1.00", inline: true },
        { name: "Max Price (capped)", value: "$5.00", inline: true },
        { name: "Total Supply", value: "10,000,000", inline: true },
        { name: "Max Reward / Day", value: "100 PLC", inline: true },
        { name: "Quests Per Day", value: "3 Total", inline: true },
        {
          name: "How to Earn",
          value:
            "Complete the daily quests and play for up to **3 hours** to earn tokens. The more quests completed and more time played, the bigger your share!",
        },
        {
          name: "Fair Play Only",
          value:
            "⚠️ Quests must be **manually completed** by the player. Use of **modded machines, auto-crafters, or automation** will **not count** toward progress.",
        },
        {
          name: "Price Dynamics",
          value:
            "📈 Token value is updated **daily** based on overall player quest completions and server activity. Price ranges between **$1.00** and **$5.00**.",
        },
        {
          name: "Important",
          value:
            "❗ **PLC cannot be bought**. It must be **earned** through gameplay. You can only **sell** your earned PLC on the crypto market.",
        }
      )
      .setFooter({ text: "Happy trading on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("PLC announcement sent!");
  } catch (err) {
    console.error("Failed to send PLC announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
