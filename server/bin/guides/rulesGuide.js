import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import config from "../../config/index.js";
import dotenv from "dotenv";

dotenv.config();

const { GREEN } = config.uiColors;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_RULES_CHANNEL_ID } = process.env;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(DISCORD_RULES_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("📜 Server Rules – Creatington Minecraft)")
      .setColor(GREEN)
      .setDescription(
        "Follow these rules to keep the server safe, fair, and fun for everyone.",
      )
      .addFields(
        {
          name: "👥 General Conduct",
          value: [
            "1. **Respect All Players** – No harassment, discrimination, offensive language, or toxic behavior (chat, voice, builds, images).",
            "2. **No Griefing or Stealing** – Don’t alter/destroy others’ builds or take items that aren’t yours.",
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
          name: "⚙️ Technical & Fair Play",
          value: [
            "13. Avoid **excessive lag** machines. Report runaway contraptions.",
            "14. Respect community resources & trades. No scams.",
            "15. Follow staff guidance on technical builds/issues.",
            "16. Its strictly forbidden to use a cart assembler (contraption being assembled and disassembled) to break blocks in any kind of Farm.",
            "17. Any cobble / stone / zulatanite ... Generator needs to be build the following way: (exception the Create: Cobble Gen Generator).",
            "	- Uses drills to break the blocks.",
            "	- Got a Lava source block next to it (not flowing lava) generating 'the block'. (Besides the Farms that use the vanilla way, and the vanilla way needs a flowing lava source)",
            "	- Got a Chute (or Smart Chute) below it (next block) catching the generated block.",
            "	- Need a automatic switch off, when the inventory it feeds, flows over. (Use a threshold switch and clutch)",
            '18. The processing or transport of items must happen with methods proving an "inventory" and not be dropped into the world as item.',
            "	- Belts, Chutes, depos got an internal inventory.",
            '	- Funnels not in their "Belt stage" do drop items into the world, no matter if something can pick them up. Therefore this should be avoided',
          ].join("\n"),
        },
        {
          name: "⚠️ Enforcement",
          value:
            "Breaking rules may lead to warnings, temp bans, or permanent bans depending on severity. Report violations to staff instead of taking matters into your own hands.",
        },
      )
      .setFooter({
        text: "Thanks for keeping Creatington safe & fun!",
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Server rules sent!");
  } catch (err) {
    console.error("Failed to send server rules:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
