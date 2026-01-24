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
    "Missing CLIENT_BOT_TOKEN or DISCORD_ANNOUNCEMENT_CHANNEL_ID env vars.",
  );
  process.exit(1);
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(publishChannel);

    if (!channel || !channel.isTextBased()) {
      throw new Error(
        "Provided channel is not text-based or could not be found.",
      );
    }

    const updatedMods = [
      "- [Create 6.0.9](https://www.curseforge.com/minecraft/mc-mods/create)",
      "- [Create: More Girders](https://www.curseforge.com/minecraft/mc-mods/create-more-girder)",
      "- [Create: Northstar Redux](https://www.curseforge.com/minecraft/mc-mods/northstar-redux)",
    ].join("\n");
    // const deletedMods = [].join("\n");
    const newMods = [
      "- [Create: Broken Bad](https://www.curseforge.com/minecraft/mc-mods/create-broken-bad)",
      "- [Create: Slice n Dice FIX](https://www.curseforge.com/minecraft/mc-mods/create-6-0-9-slice-and-dice-4-2-2-compat)",
    ].join("\n");

    const version = "v0.2.7";

    const embed = new EmbedBuilder()
      .setTitle(`🛠️ Createrington: Cogs & Steam ${version} Modpack Update`)
      .setColor(0x00b0f4)
      .setDescription(
        `A new version of the modpack is now available! Please update to **${version}** to receive the latest improvements, fixes, and features.`,
      )
      .addFields(
        // {
        //   name: "🔭 Create: Northstar Redux Highlight",
        //   value:
        //     "**Northstar Redux** expands Create’s late-game progression with **space-themed technology, materials, and advanced components**.\n\n" +
        //     "It introduces new goals for experienced engineers, encouraging **larger factories, deeper automation chains, and long-term progression** while staying true to Create’s mechanical style.",
        // },
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
        },
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
