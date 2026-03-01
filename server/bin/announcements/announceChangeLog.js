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
      "- [AFKStatus](https://www.curseforge.com/minecraft/mc-mods/afkstatus)",
      "- [Create Shuffle Filters](https://www.curseforge.com/minecraft/mc-mods/create-shuffle-filter)",
      "- [Create: Train Parts](https://www.curseforge.com/minecraft/mc-mods/create-train-parts)",
      "- [Create: Bits n Bobs](https://www.curseforge.com/minecraft/mc-mods/create-bits-n-bobs)",
      "- [Create: More Girder](https://www.curseforge.com/minecraft/mc-mods/create-more-girder)",
      "- [Lootr](https://www.curseforge.com/minecraft/mc-mods/lootr)",
    ].join("\n");
    // const deletedMods = [].join("\n");
    const newMods = [
      "- [Clavis](https://www.curseforge.com/minecraft/mc-mods/clavis)",
      "- [Create: Hypertubes](https://www.curseforge.com/minecraft/mc-mods/hypertubes)",
      "- [Create: Transmission](https://www.curseforge.com/minecraft/mc-mods/create-transmission)",
      "- [Create: Winery](https://www.curseforge.com/minecraft/mc-mods/create-winery)",
      "- [Create: Pattern Schematics](https://www.curseforge.com/minecraft/mc-mods/create-pattern-schematics)",
      "- [Create: Drill Drain](https://www.curseforge.com/minecraft/mc-mods/create-drill-drain)",
      "- [Ben's Sharks](https://www.curseforge.com/minecraft/mc-mods/bens-sharks)",
      "- [Ribbits](https://www.curseforge.com/minecraft/mc-mods/ribbits)",
      "- [Another Furniture Mod](https://www.curseforge.com/minecraft/mc-mods/another-furniture)",
      "- [Simple Hats](https://www.curseforge.com/minecraft/mc-mods/simplehats)",
    ].join("\n");

    const version = "v0.2.8";

    const embed = new EmbedBuilder()
      .setTitle(`🛠️ Createrington: Cogs & Steam ${version} Modpack Update`)
      .setColor(0x00b0f4)
      .setDescription(
        `A new version of the modpack is now available! Please update to **${version}** to receive the latest improvements, fixes, and features.`,
      )
      .addFields(
        {
          name: "🔭 Create: Shuffle Filter Highlight",
          value:
            "As the Mod has major internal changes, All shuffle filter items need to be reconfigured with their blocks.",
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
