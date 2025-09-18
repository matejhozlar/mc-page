import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import config from "../../config/index.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID } = process.env;

const { RED } = config.uiColors;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    const embed = new EmbedBuilder()
      .setTitle(
        "⚠️ Urgent Notice: Do Not Use Create: Ender Link (Ender Storages)"
      )
      .setColor(RED)
      .setDescription(
        [
          "**Impact:** Using **Create: Ender Link** ender storages is causing **all trains to disappear** on the server.",
          "",
          "**Required Action:** Please **do not craft, place, or use** any Ender Link storages. If you currently have any placed, **dismantle and remove them immediately** to prevent further issues.",
          "",
          "**Upcoming Change:** The mod **Create: Ender Link** will be **removed in the next update** to protect world stability and player progress.",
          "",
          "**Cleanup:** If possible, we will attempt to **delete remaining Ender Link storages** during maintenance. Removing your own placements would help save some time and overcome issues.",
          "",
          "If you’ve already experienced missing trains or related issues, please report it to the staff team to get material refunds if needed.",
        ].join("\n")
      )
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Warning announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
