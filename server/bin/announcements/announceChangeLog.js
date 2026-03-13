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

function splitField(name, value, limit = 1024) {
  if (value.length <= limit) return [{ name, value }];
  const lines = value.split("\n");
  const fields = [];
  let chunk = "";
  for (const line of lines) {
    if (chunk && (chunk + "\n" + line).length > limit) {
      fields.push({
        name: fields.length === 0 ? name : `${name} (cont.)`,
        value: chunk,
      });
      chunk = line;
    } else {
      chunk = chunk ? chunk + "\n" + line : line;
    }
  }
  if (chunk)
    fields.push({
      name: fields.length === 0 ? name : `${name} (cont.)`,
      value: chunk,
    });
  return fields;
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

    const newMods = [
      "- [PVP Flagged](https://www.curseforge.com/minecraft/mc-mods/pvp-flagging)",
      "- [Brewin' And Chewin'](https://www.curseforge.com/minecraft/mc-mods/brewin-and-chewin)",
      "- [Cocktails Delight](https://www.curseforge.com/minecraft/mc-mods/cocktails-delight)",
      "- [Create: Fluid](https://www.curseforge.com/minecraft/mc-mods/create-fluid)",
    ].join("\n");
    const deletedMods = [
      "- [Create: Winery](https://www.curseforge.com/minecraft/mc-mods/create-winery)",
      "- [Create: Slice & Dice Compat](https://www.curseforge.com/minecraft/mc-mods/create-6-0-9-slice-and-dice-4-2-2-compat)",
    ].join("\n");
    const updatedMods = [
      "- [Create: Slice & Dice](https://www.curseforge.com/minecraft/mc-mods/slice-and-dice)",
      "- [Create: Central Kitchen](https://www.curseforge.com/minecraft/mc-mods/create-central-kitchen)",
      "- [Create: Dragons Plus](https://www.curseforge.com/minecraft/mc-mods/create-dragons-plus)",
      "- [Create: Transmission](https://www.curseforge.com/minecraft/mc-mods/create-transmission)",
      "- [Farmer's Delight](https://www.curseforge.com/minecraft/mc-mods/farmers-delight)",
      "- [Macaw's](https://www.curseforge.com/members/sketch_macaw/projects)",
      "- [MrCrayfish's](https://www.curseforge.com/members/mrcrayfish/projects)",
      "- [Pretty in Pink](https://www.curseforge.com/minecraft/mc-mods/pretty-in-pink)",
      "- [Rechiseled](https://www.curseforge.com/minecraft/mc-mods/rechiseled)",
      "- [Rechiseled: Create](https://www.curseforge.com/minecraft/mc-mods/rechiseled-create)",
      "- [Sound Physics Remastered](https://www.curseforge.com/minecraft/mc-mods/sound-physics-remastered)",
      "- [Framework](https://www.curseforge.com/minecraft/mc-mods/framework)",
      "- [Supermartji](https://www.curseforge.com/minecraft/mc-mods/supermartijn642s-config-lib)",
      "- [Fusion](https://www.curseforge.com/minecraft/mc-mods/fusion-connected-textures)",
    ].join("\n");

    const version = "v0.2.9";

    const embed = new EmbedBuilder()
      .setTitle(`🛠️ Createrington: Cogs & Steam ${version} Modpack Update`)
      .setColor(0x00b0f4)
      .setDescription(
        `A new version of the modpack is now available! Please update to **${version}** to receive the latest improvements and fixes.`,
      )
      .addFields(
        {
          name: "🍻 Highlight: Brewin' And Chewin' + Cocktails Delight",
          value: [
            "- Craft **beverages, cocktails & brewed drinks** using Create's mechanical systems",
            "- Pair with Farmer's Delight recipes for a full culinary experience",
          ].join("\n"),
        },
        // {
        //   name: "🔭 Highlight",
        //   value: [
        //     "• description",
        //   ].join("\n"),
        // },
        {
          name: "🆕 New Mods",
          value: newMods || "—",
        },
        {
          name: "🗑️ Removed Mods",
          value: deletedMods || "—",
        },
        {
          name: "⬆️ Updated Mods",
          value: updatedMods || "—",
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
