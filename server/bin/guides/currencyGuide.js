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
      .setTitle("💰 Createrington Currency Mod Guide **v1.1.3**")
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
          name: "Enchant Capitalist Greed",
          value: [
            "- Capitalist Greed I → +5%",
            "- Capitalist Greed II → +8%",
            "- Capitalist Greed III → +10%",
          ].join("\n"),
        },
        {
          name: "⚔️ Mob Farming & Drop Rates",
          value: [
            "- Zombies, Spiders, Creepers → **2% chance** to drop $1 bill.",
            "- Skeletons → **3% chance** to drop $1 bill.",
            "- Skeletons also have a **1% chance** to drop a $5 bill.",
            "- Daily mob farming limit: **$1000 per day**.",
            "- Once limit is reached, no more bills will drop that day.",
          ].join("\n"),
        },
        {
          name: "💻 Commands",
          value: [
            "**/money** — Check your current balance.",
            "**/pay <player> <amount>** — Send money to another player (player-to-player trading).",
            "**/baltop** — See the top 10 richest players on the server.",
            "**/daily** — Claim your daily reward.",
            "**/lottery <amount>** —  Start a server-wide lottery with a minimum of $10.",
            "**/join <amount>** — Join the ongoing lottery.",
          ].join("\n"),
        },
        {
          name: "🏧 ATM Block",
          value: [
            "The ATM is a powerful tool for depositing and withdrawing money directly from your bank account.",
            "",
            "**Crafting Recipe:**",
            "- 4x Iron Blocks",
            "- 3x Circuit Boards",
            "- 1x Keypad",
            "- 1x Chest",
            "",
            "Once crafted, place the ATM in the world to safely manage your funds without relying on commands.",
          ].join("\n"),
        },
        {
          name: "📦 How It Works",
          value: [
            "- Earn money by killing spiders, zombies, creepers and skeletons!",
            "- Use **/withdraw** to get bills you can carry and trade.",
            "- Use **/deposit** to convert bills back into your account balance.",
            "- Always check your balance with **/money** before transactions!",
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
    console.log("Currency guide sent!");
  } catch (err) {
    console.error("Failed to send currency guide:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
