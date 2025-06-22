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
      .setTitle("🛠️ Createrington v0.1.8 Modpack Update")
      .setColor(0x00b0f4)
      .setDescription(
        "A new version of the modpack is now available! Please update to **v0.1.8** to enjoy new content and improvements."
      )
      .addFields(
        {
          name: "🆕 New Mods",
          value: [
            "- Simple Hats",
            "- Magic Mirror",
            "- owo library",
            "- accessories library",
          ].join("\n"),
        },
        {
          name: "⬆️ Updated Mods",
          value: "- Createrington Currency",
        },
        {
          name: "📢 Reminder",
          value:
            "Please **update the modpack** to the latest version.\nIf you encounter **any bugs or issues**, report them as soon as possible!",
        }
      )
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("📣 Update announcement sent!");
  } catch (err) {
    console.error("❌ Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(DISCORD_BOT_TOKEN);
