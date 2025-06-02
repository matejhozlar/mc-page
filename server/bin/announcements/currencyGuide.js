import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { DISCORD_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID } = process.env;

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    const embed = new EmbedBuilder()
      .setTitle("💰 Createrington Currency Mod Guide **(Alpha)**")
      .setColor(0x00b0f4)
      .setDescription(
        "Here’s a quick guide on how to use the **Currency Mod** on Createrington!"
      )
      .addFields(
        {
          name: "💵 Currency Items",
          value:
            "Collect bills in various denominations: **$1, $5, $10, $20, $50, $100, $500, $1000**. These bills can be stacked, traded, and stored in your inventory.",
        },
        {
          name: "💻 Commands",
          value: [
            "**/money** — Check your current balance.",
            "**/deposit** — Deposit all bills from your inventory into your account.",
            "**/withdraw <amount>** — Withdraw money into physical bills (automatically optimizes denominations).",
            "**/withdraw <denomination> <count>** — Withdraw specific bills (e.g. `/withdraw 50 2`).",
            "**/pay <player> <amount>** — Send money to another player (player-to-player trading).",
            "**/baltop** — See the top 10 richest players on the server.",
          ].join("\n"),
        },
        {
          name: "📦 How It Works",
          value: [
            "- Earn money by killing spiders, zombies, creepers and skeletons!",
            "- Use **/withdraw** to get bills you can carry and trade.",
            "- Use **/deposit** to convert bills back into your account balance.",
            "- Always check your balance with **/money** before transactions!",
            "*Note: Currently there is a daily limit of $1000 from mob drops*",
          ].join("\n"),
        },
        {
          name: "📢 Reminder",
          value:
            "Take good care of your bills — if you lose them, you lose your money!",
        }
      )
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("📣 Currency guide sent!");
  } catch (err) {
    console.error("❌ Failed to send currency guide:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(DISCORD_BOT_TOKEN);
