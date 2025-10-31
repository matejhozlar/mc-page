import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const {
  CLIENT_BOT_TOKEN,
  DISCORD_DOWNLOAD_GUIDE_CHANNEL_ID,
  DISCORD_SUPPORT_TICKET_CHANNEL_ID,
} = process.env;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_DOWNLOAD_GUIDE_CHANNEL_ID
    );

    const embed = new EmbedBuilder()
      .setTitle("Download & Setup Guide – Createrington: Cogs & Steam")
      .setColor(0x2196f3)
      .setDescription(
        "Getting started is super easy! We recommend using **CurseForge** for the smoothest experience. It's one-click to install, and everything is pre-configured."
      )
      .addFields(
        {
          name: "✅ Recommended Setup – CurseForge",
          value: [
            "1. Install the [CurseForge App](https://download.curseforge.com/)",
            "2. Open this link [Createrington: Cogs & Steam](https://www.curseforge.com/minecraft/modpacks/createrington-cogs-steam)",
            "3. Click **Install through CurseForge App**, wait for the modpack to download",
            "4. Then **Play** – you're done!",
            "Both the main server and the test server are already in your multiplayer tab",
            "",
          ].join("\n"),
        },
        {
          name: "Manual Installation (Not Recommended)",
          value: [
            "For experienced users who prefer manual installs:",
            "- Download the full mod list: [Google Drive](https://drive.google.com/file/d/1i9OM6wa4Wg3fv9BoebOlEO-ycmDmFTg7/view?usp=sharing)",
            "- Use your preferred launcher (Prism, MultiMC, etc)",
            "- Make sure you're using **NeoForge 1.21.1** and match all mod versions exactly",
            "",
            "**⚠️ Issues with mod conflicts, config mismatches, or missing dependencies will not be supported unless you're using CurseForge.**",
          ].join("\n"),
        },
        {
          name: "Server Info",
          value: [
            "- **IP Address**: `create-rington.mcserv.fun`",
            "- **Seed**: `9151016444323366715` *(For seed tools, select **Large Biomes**)*",
          ].join("\n"),
        },
        {
          name: "**Need help?**",
          value: `Create a ticket in <#${DISCORD_SUPPORT_TICKET_CHANNEL_ID}>`,
        }
      )
      .setFooter({
        text: `Thanks for playing on Createrington!`,
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Download Guide sent!");
  } catch (error) {
    console.error("Failed to send announcement:", error);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
