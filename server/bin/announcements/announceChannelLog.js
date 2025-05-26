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
      .setTitle("🛠️ Createrington v0.1.6 Modpack Update")
      .setColor(0x00b0f4)
      .setDescription(
        "A new version of the modpack is now available! Please update to **v0.1.6** to enjoy new content and improvements."
      )
      .addFields(
        {
          name: "🆕 New Mods",
          value: [
            "- Create: Aquatic Ambitions",
            "- Create: Connected",
            "- Create: Railways Navigator",
            "- Create: Stock Bridge",
            "- Create: Central Kitchen",
            "- The Afterdark",
            "- Deeper Darker",
            "- Jamlib",
            "- KubeJS",
            "- Rhino",
            "- ResourcefulConfig",
            "- RightClickHarvest",
            "- Tempad",
          ].join("\n"),
        },
        {
          name: "⬆️ Updated Mods",
          value: [
            "- Create: Dragons Plus",
            "- Create: Enchantment Industry",
            "- Create: Garnished",
            "- Txnlib",
          ].join("\n"),
        },
        {
          name: "📢 Reminder",
          value:
            "Please **update the modpack** to the latest version.\nIf you encounter **any bugs or issues**, report them as soon as possible!",
        },
        {
          name: "⚠️ IMPORTANT: Teleportation Change",
          value:
            "**The `/tpa` command has been removed.**\nFrom now on, use the **Tempad** mod for any teleportation!\n(/home is still available)",
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
