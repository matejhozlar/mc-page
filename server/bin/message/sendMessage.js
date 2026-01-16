import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const {
  DISCORD_ANNOUNCEMENT_CHANNEL_ID,
  DISCORD_PLAYER_ROLE_ID,
  DISCORD_TEST_CHANNEL_ID,
  DISCORD_WEBSITE_BUGS_CHANNEL_ID,
} = process.env;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );

    if (!channel.isTextBased()) {
      console.error("Channel is not text based!");
      process.exit(1);
    }

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Known Server Crash – Fix in Progress")
      .setColor(0xffa500)
      .setDescription(
        `We want to make everyone aware of a **known server crash** that we are actively investigating and fixing.\n\n` +
          `### What’s happening?\n` +
          `The server may crash when a **torch is placed on a wall next to flowing water**. ` +
          `This interaction triggers an internal error during world updates, which can cause the server to stop unexpectedly.\n\n` +
          `### What are we doing?\n` +
          `Our team has identified the cause of the issue and is **actively working on a fix**. ` +
          `We believe this issue will be **fully resolved by tomorrow**.\n\n` +
          `### What can you do for now?\n` +
          `Please try to **avoid placing wall torches near flowing water** until the fix is deployed. ` +
          `This will help prevent additional crashes while we finalize the solution.\n\n` +
          `### Questions & Answers\n` +
          `**Q: What should I do if I try to join the server and it crashes, causing me to get kicked?**\n` +
          `A: Please **do not keep trying to rejoin**. Contact an admin so we can help resolve any spawn-related issues caused by this bug.\n\n` +
          `**Q: Is this dangerous for the server or world?**\n` +
          `A: **No.** Nothing should break or corrupt the world. The issue is not dangerous. It’s just **very annoying** and causes temporary crashes.\n\n` +
          `Thank you for your patience and for helping keep the server stable 💛`
      )
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({
      content: `||<@&${DISCORD_PLAYER_ROLE_ID}>||`,
      embeds: [embed],
    });

    console.log("Bug report announcement sent!");
  } catch (err) {
    console.error("Failed to send message:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.CLIENT_BOT_TOKEN);
