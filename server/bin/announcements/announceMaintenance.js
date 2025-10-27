import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import config from "../../config/index.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID } = process.env;

const START_UNIX = 1761606000;
const END_UNIX_EARLY = 1761631200;
const END_UNIX_LATE = 1761634800;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    const embed = new EmbedBuilder()
      .setTitle(
        "🛠️ Scheduled Maintenance: Website, Bots, Currency & Voting Offline"
      )
      .setColor(0xffa500)
      .setDescription(
        [
          "We’re performing **server maintenance** that will temporarily take the **entire website**, **in-game currency**, and **voting system** **offline**.",
          "Thanks for your patience while we keep things fast and stable!",
        ].join("\n\n")
      )
      .addFields(
        {
          name: "📅 Schedule",
          value: [
            `• **Start:** <t:${START_UNIX}:F> (<t:${START_UNIX}:R>)`,
            `• **Estimated Finish:** between <t:${END_UNIX_EARLY}:t> and <t:${END_UNIX_LATE}:t>`,
            `• **Duration:** ~8 hours`,
          ].join("\n"),
        },
        {
          name: "🔒 What’s affected",
          value: [
            "- Website (all pages & APIs)",
            "- Discord Bots (all commands)",
            "- In-game currency (balances, trades, payouts)",
            "- Voting system",
          ].join("\n"),
        }
      )
      .setFooter({ text: "Thank you for playing on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Maintenance announcement sent!");
  } catch (error) {
    console.error("Failed to send announcement:", error);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
