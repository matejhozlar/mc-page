import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const { DISCORD_BOT_TOKEN, DISCORD_CRYPTO_CHANNEL_ID } = process.env;

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
      console.log(`📣 Crash alert sent for ${token.name} (${token.symbol})`);
    } catch (err) {
      console.error("❌ Failed to send crash alert:", err);
    } finally {
      client.destroy();
    }
  });

  await client.login(DISCORD_BOT_TOKEN);
}
