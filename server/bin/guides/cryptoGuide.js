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
      .setTitle("🪙 Createrington Crypto Guide")
      .setColor(0xffcb05)
      .setDescription(
        "Welcome to the **Createrington Crypto** — trade tokens using your Minecraft balance and grow your wealth!"
      )
      .addFields(
        {
          name: "🔐 Getting Started",
          value: [
            "- Log in on the website [Here](https://create-rington.com)",
            "- Go to the **Crypto** tab to begin trading.",
            "- Click on a token to buy or sell.",
          ].join("\n"),
        },
        {
          name: "📈 Crypto Overview",
          value: [
            "- Each token has a live price that changes over time.",
            "- You’ll see details like: **Price**, **Supply**, **Ownership**, and **Price History**.",
            "- You can track price trends in intervals like **1h, 24h, 7d, 30d, all**.",
          ].join("\n"),
        },
        {
          name: "💰 Profile & Portfolio",
          value: [
            "- View your **balance**, and **token holdings**.",
            "- Your total net worth = token portfolio + in-game balance.",
            "- Portfolio chart shows value over time.",
          ].join("\n"),
        },
        {
          name: "📊 Tokens",
          value: [
            "- Buy low, sell high! Track performance via charts.",
            "- Limited supply means some tokens become more valuable over time.",
            "- Prices update live every x seconds/minutes depending on the token.",
          ].join("\n"),
        },
        {
          name: "🪙 Memecoins",
          value: [
            "- These coins are **randomly** generated and have no fixed value.",
            "- The price of the memecoins fluctuates entirely **random**, meaning their value can rise and fall **unpredictably**.",
            "- Players **loose all investments** if the coin **crashes**.",
            "- There is no guarantee of profit — the coin's value can change dramatically at any time.",
            "- A **5% tax** applies whenever players buy or sell meme coins.",
            "- The value can fluctuate rapidly, so only invest what you're willing to lose.",
          ].join("\n"),
        },
        {
          name: "🎮 Games",
          value: [
            "- Visit the **Games** tab to play the [Clicker Game](https://create-rington.com/game).",
            "- Each game will have ways to get currency in the future (not yet).",
            "- More games coming soon!",
          ].join("\n"),
        },
        {
          name: "💡 Tips",
          value: [
            "- Use your **in-game currency** wisely to buy tokens.",
            "- Watch for price drops to make smart investments.",
            "- Track your transaction history in the **Profile** tab.",
          ].join("\n"),
        },
        {
          name: "📣 Reminder",
          value:
            "All trades are final. Make sure you're confident before confirming any transaction!",
        }
      )
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Crypto guide sent!");
  } catch (err) {
    console.error("Failed to send crypto guide:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
