import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import logger from "../../../logger.js";

dotenv.config();

const { CLIENT_BOT_TOKEN, DISCORD_CRYPTO_CHANNEL_ID } = process.env;

/**
 * Sends a crash notification embed for a token to a Discord channel.
 *
 * @param {Object} token - The token that crashed.
 * @param {string} token.name - The name of the token (e.g., "Shiba").
 * @param {string} token.symbol - The token symbol (e.g., "SHIB").
 * @param {string} [token.description] - Optional description of the token.
 * @param {number|string} token.price_per_unit - The last known price per unit of the token.
 * @param {number} [token.total_supply] - The total supply of the token.
 */
export async function sendCrashNotification(token) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    try {
      const channel = await client.channels.fetch(DISCORD_CRYPTO_CHANNEL_ID);

      const embed = new EmbedBuilder()
        .setTitle(`💀 Token Crashed: ${token.name} (${token.symbol})`)
        .setColor(0xff0000)
        .setDescription(token.description || "No description provided.")
        .addFields(
          {
            name: "💵 Last Known Price",
            value: `$${parseFloat(token.price_per_unit).toFixed(4)}`,
            inline: true,
          },
          {
            name: "📦 Total Supply",
            value:
              token.total_supply != null
                ? Math.round(token.total_supply).toLocaleString()
                : "Unknown",
            inline: true,
          },
          { name: "🧬 Type", value: "Memecoin", inline: true }
        )
        .setFooter({ text: "Createrington Market" })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      logger.info(`Crash alert sent for ${token.name} (${token.symbol})`);
    } catch (error) {
      logger.error("Failed to send crash alert:", error);
    } finally {
      client.destroy();
    }
  });

  await client.login(CLIENT_BOT_TOKEN);
}
