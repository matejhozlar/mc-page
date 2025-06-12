import pg from "pg";
import fs from "fs";
import dotenv from "dotenv";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";

dotenv.config();

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const memecoins = JSON.parse(fs.readFileSync("memecoins.json", "utf8"));
const { DISCORD_BOT_TOKEN, DISCORD_CRYPTO_CHANNEL_ID } = process.env;

function getRandomMemecoin() {
  const coin = memecoins[Math.floor(Math.random() * memecoins.length)];
  const rawPrice = Math.max(Math.random() * 1000, 0.0001);
  return { ...coin, price: parseFloat(rawPrice.toFixed(4)) };
}

async function sendDiscordNotification({
  name,
  symbol,
  description,
  price,
  totalSupply,
}) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    try {
      const channel = await client.channels.fetch(DISCORD_CRYPTO_CHANNEL_ID);

      const embed = new EmbedBuilder()
        .setTitle(`🚀 New Memecoin Launched: ${name} (${symbol})`)
        .setColor(0xffcb05)
        .setDescription(description || "No description provided.")
        .addFields(
          { name: "💵 Initial Price", value: `$${price}`, inline: true },
          {
            name: "📦 Total Supply",
            value: totalSupply.toLocaleString(),
            inline: true,
          },
          { name: "🧬 Type", value: "Memecoin", inline: true }
        )
        .setFooter({ text: "Createrington Market" })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      console.log("📣 Sent memecoin notification to Discord!");
    } catch (err) {
      console.error("❌ Failed to send Discord notification:", err);
    } finally {
      client.destroy();
    }
  });

  await client.login(DISCORD_BOT_TOKEN);
}

async function insertMemecoin({ name, symbol, description, price }) {
  try {
    const totalSupply =
      Math.floor(Math.random() * (10_000_000 - 1_000 + 1)) + 1_000;
    const availableSupply = totalSupply;

    await db.query(
      `INSERT INTO crypto_tokens 
       (name, symbol, description, price_per_unit, total_supply, available_supply, is_memecoin)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [name, symbol, description, price, totalSupply, availableSupply]
    );

    console.log(
      `✅ Created memecoin ${name} ($${symbol}) at $${price} with supply ${totalSupply}`
    );

    await sendDiscordNotification({
      name,
      symbol,
      description,
      price,
      totalSupply,
    });
  } catch (err) {
    console.error("❌ Failed to insert memecoin:", err.message);
  } finally {
    await db.end();
  }
}

const coin = getRandomMemecoin();
insertMemecoin(coin);
