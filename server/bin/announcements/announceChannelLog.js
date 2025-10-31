import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN } = process.env;
const publishChannel = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID;

if (!CLIENT_BOT_TOKEN || !publishChannel) {
  console.error(
    "Missing CLIENT_BOT_TOKEN or DISCORD_ANNOUNCEMENT_CHANNEL_ID env vars."
  );
  process.exit(1);
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(publishChannel);

    if (!channel || !channel.isTextBased()) {
      throw new Error(
        "Provided channel is not text-based or could not be found."
      );
    }

    const updatedMods = [
      "- Createrington Currency",
      "- Fzzy Config",
      "- AFKStatus",
    ].join("\n");
    const deletedMods = ["- Create: Ender Link"].join("\n");
    const newMods = [
      "- Adorable Hamsters",
      "- Create: More Girder",
      "- EasyAnvils",
      "- Geckolib",
      "- Patchouli",
    ].join("\n");

    const version = "v0.2.3";

    const embed = new EmbedBuilder()
      .setTitle(`🛠️ Createrington: Cogs & Steam ${version} Modpack Update`)
      .setColor(0x00b0f4)
      .setDescription(
        `A new version of the modpack is now available! Please update to **${version}** to receive the latest improvements, fixes, and features.`
      )
      .addFields(
        {
          name: "💳 Createrington Currency: Bank Card",
          value:
            "Thanks to <@547450242090532874> we now have the **Bank Card** — a new Createrington Currency item that plugs straight into **Create Stock Tickers/Shops**.\n\n" +
            "**How to use:**\n" +
            "- Put it in your **offhand** while buying.\n" +
            "- You pay **directly from your bank balance** — no bills needed.",
        },
        {
          name: "⬆️ Updated Mods",
          value: updatedMods || "—",
        },
        // {
        //   name: "🗑️ Removed Mods",
        //   value: deletedMods || "—",
        // },
        {
          name: "🆕 New Mods",
          value: newMods || "—",
        },
        {
          name: "📢 Reminder",
          value:
            "Please update the modpack to the latest version.\nIf you encounter any issues or bugs, let the team know immediately!",
        }
      )
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Update announcement sent!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
