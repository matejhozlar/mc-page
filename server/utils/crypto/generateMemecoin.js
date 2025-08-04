import pg from "pg";
import fs from "fs";
import dotenv from "dotenv";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import config from "../../config/index.js";

dotenv.config();

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const {
  INITIAL_PRICE_MAX,
  INITIAL_PRICE_MIN,
  TOTAL_SUPPLY_MIN,
  TOTAL_SUPPLY_MAX,
} = config.memecoins;
const { DARK_GOLD } = config.uiColors;
const PRICE_DECIMALS = 4;

const memecoins = JSON.parse(fs.readFileSync("memeCoins.json", "utf8"));
const { CLIENT_BOT_TOKEN, DISCORD_CRYPTO_CHANNEL_ID } = process.env;

/**
 * Picks a random memecoin and assigns it a random price.
 *
 * @returns {Object} Random memecoin with name, symbol, description, and price.
 */
function getRandomMemecoin() {
  const coin = memecoins[Math.floor(Math.random() * memecoins.length)];
  const rawPrice = Math.max(
    Math.random() * INITIAL_PRICE_MAX,
    INITIAL_PRICE_MIN
  );
  return { ...coin, price: parseFloat(rawPrice.toFixed(PRICE_DECIMALS)) };
}

/**
 * Sends a Discord embed notification about a new memecoin.
 *
 * @param {Object} data
 * @param {string} data.name - The name of the memecoin.
 * @param {string} data.symbol - The symbol of the memecoin.
 * @param {string} data.description - A description of the memecoin.
 * @param {number} data.price - The initial price of the memecoin.
 * @param {number} data.totalSupply - The total token supply.
 *
 * @returns {Promise<void>}
 */
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
        .setColor(DARK_GOLD)
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

  await client.login(CLIENT_BOT_TOKEN);
}

/**
 * Inserts a memecoin into the database and sends a Discord notification.
 *
 * @param {Object} data
 * @param {string} data.name - The name of the memecoin.
 * @param {string} data.symbol - The memecoin's ticker symbol.
 * @param {string} data.description - Description of the memecoin.
 * @param {number} data.price - Starting price per unit.
 *
 * @returns {Promise<void>}
 */

async function insertMemecoin({ name, symbol, description, price }) {
  try {
    const totalSupply =
      Math.floor(Math.random() * (TOTAL_SUPPLY_MAX - TOTAL_SUPPLY_MIN + 1)) +
      TOTAL_SUPPLY_MIN;
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
