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
      .setTitle("🛠️ Createrington v0.1.7 Modpack Update")
      .setColor(0x00b0f4)
      .setDescription(
        "A new version of the modpack is now available! Please update to **v0.1.7** to enjoy new content and improvements."
      )
      .addFields(
        {
          name: "⚖️ Create: Sifting Changes",
          value:
            "We've rebalanced the **Create: Sifting** recipes to make progression more fair:\n- Removed **Netherite**, **Diamonds**, and other high-end items from drops.\n- Sifting now provides more balanced rewards without being overpowered.",
        },
        {
          name: "⚠️ IMPORTANT",
          value:
            "Since some of the sifting recipes are gone, please check your farms!",
        },
        {
          name: "🆕 New Mods",
          value: [
            "- AdvancedAE",
            "- ExtendedAE",
            "- Createrington Currency",
            "- Create: Copycats +",
            "- Create: Deep Dark",
            "- Geckolib",
          ].join("\n"),
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
