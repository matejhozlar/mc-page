import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_QUESTS_CHANNEL_ID, DISCORD_PLAYER_ROLE_ID } =
  process.env;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(DISCORD_QUESTS_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("📢 Daily Quests Are Coming!")
      .setColor(0x00b0f4)
      .setDescription(
        `<@&${DISCORD_PLAYER_ROLE_ID}> — get ready to compete!\n\nEvery day, **three shared quests** will be posted in this channel. Complete them together as a server to unlock **PLC token rewards** for everyone who's active!\n\nCheck back here daily to see the goals, track your progress, and make your time on Createrington even more rewarding.`
      )
      .addFields(
        {
          name: "How it Works",
          value:
            "Each day at **6:15 AM CET**, new quests will be announced. Progress updates are posted every hour!",
        },
        {
          name: "Why It Matters",
          value:
            "The more quests you all complete, the more PLC everyone can earn — and the more valuable PLC becomes!",
        }
      )
      .addFields({
        name: "🚫 No Auto-Crafting or Modded Shortcuts",
        value:
          "**To complete quests, you must do them *yourself*.**\n" +
          "Using **modded machines**, especially **AE2 crafting (including wireless terminals)**, or any **auto-crafting system**, will NOT count.\n\n" +
          "✅ **Manual crafting only** — prefer **vanilla** or **backpack crafting menus**.",
      })
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({
      content: `<@&${DISCORD_PLAYER_ROLE_ID}>`,
      embeds: [embed],
    });
    console.log("Quest intro announcement sent!");
  } catch (err) {
    console.error("Failed to send quest intro:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
