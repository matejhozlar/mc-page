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
      "- Chat Heads",
      "- Create More: Package Couriers",
      "- Create: Central Kitchen",
      "- Create: Dragons Plus",
      "- Createringon Currency",
      "- Create: Slice n Dice",
      "- Create: Industrialized Architecture",
    ].join("\n");
    const deletedMods = ["- Create: Ender Link"].join("\n");
    const newMods = ["- Create: Brassworks Missions"].join("\n");

    const version = "v0.2.2";

    const embed = new EmbedBuilder()
      .setTitle(`🛠️ Createrington: Cogs & Steam ${version} Modpack Update`)
      .setColor(0x00b0f4)
      .setDescription(
        `A new version of the modpack is now available! Please update to **${version}** to receive the latest improvements, fixes, and features.`
      )
      .addFields(
        {
          name: "🎯 In-game missions",
          value:
            "We’ve added new in-game missions to keep your adventure fresh. Press **H** to open the mission interface or use **/missions** anytime. Missions reset every week, reward you with in-game currency.",
        },
        // {
        //   name: "⬆️ Updated Mods",
        //   value: updatedMods || "—",
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
