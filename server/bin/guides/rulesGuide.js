import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import config from "../../config/index.js";
import dotenv from "dotenv";

dotenv.config();

const { GREEN } = config.uiColors;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN } = process.env;

// Hardcoded IDs
const GUILD_ID = "1224344391125041284";
const CHANNEL_ID = "1360911343795830795";
const MESSAGE_ID = "1418190863510671412";

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(CHANNEL_ID);
    const message = await channel.messages.fetch(MESSAGE_ID);

    const embed = new EmbedBuilder()
      .setTitle("📜 Server Rules – Createrington Minecraft")
      .setColor(GREEN)
      .setDescription(
        "Follow these rules to keep the server safe, fair, and fun for everyone.",
      )
      .addFields(
        {
          name: "👥 General Conduct",
          value: [
            "1. **Respect All Players** – No harassment, discrimination, offensive language, or toxic behavior (chat, voice, builds, images).",
            "2. **No Griefing or Stealing** – Don't alter/destroy others' builds or take items that aren't yours.",
            "3. **No Cheating or Exploits** – Only use allowed mods. No hacks or unfair advantages.",
            "4. **Build Responsibly** – Keep distance, avoid laggy contraptions, clean up after yourself.",
            "5. **PvP Rules** – Only with consent. No spawn killing, trapping, or tricking.",
            "6. **Staff Decisions are Final** – Disagreements go to staff privately.",
          ].join("\n"),
        },
        {
          name: "🚂 Trains & Rail Networks",
          value: [
            "7. All trains must drive on the **right side**.",
            "8. If using the **public rail network**, install signals to avoid crashes.",
            "9. Prefer building stations/tracks on **public land**. If on claims, set perms so doors/buttons/seats work for all.",
          ].join("\n"),
        },
        {
          name: "🖼️ Custom Images & Media",
          value: [
            "10. **Camera** & **Immersive Paintings** are for immersive decoration only.",
            "11. Keep **file sizes small**. Overuse may remove this feature.",
            "12. No **NSFW, racist, political, harassing, or disruptive** content.",
          ].join("\n"),
        },
        {
          name: "⚙️ Technical & Fair Play (Part 1)",
          value: [
            "13. Avoid **excessive lag** machines. Report runaway contraptions.",
            "14. Respect community resources & trades. No scams.",
            "15. Follow staff guidance on technical builds/issues.",
            "16. It's strictly **forbidden** to use a contraption being **assembled and disassembled in short intervalls** to break blocks in any kind of farm. -> Use drills or deployers with pickaxes",
          ].join("\n"),
        },
        {
          name: "⚙️ Technical & Fair Play (Part 2)",
          value: [
            "17. Any cobble/stone/zulatanite generator needs to be built the following way (exception: Create Cobble Gen Generator):",
            "    • Uses drills to break the blocks",
            "    • Has a Chute or Smart Chute below it (next block) catching the generated block",
            "    • Needs automatic shutoff when the inventory it feeds overflows (use threshold switch and clutch)",
            "18. The processing or transport of items must happen with methods providing an **inventory**, not dropped into the world as items:",
            "    • Belts, Chutes, and Depots have internal inventory",
            "    • Funnels not in their 'Belt stage' drop items into the world and should be avoided",
          ].join("\n"),
        },
        {
          name: "⚠️ Enforcement",
          value:
            "Breaking rules may lead to warnings, temp bans, or permanent bans depending on severity. Report violations to staff instead of taking matters into your own hands.",
        },
      )
      .setFooter({
        text: "Thanks for keeping Createrington safe & fun!",
      })
      .setTimestamp();

    await message.edit({ embeds: [embed] });
    console.log("Server rules message updated!");
  } catch (err) {
    console.error("Failed to update server rules:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
