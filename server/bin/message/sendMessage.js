import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const {
  DISCORD_ANNOUNCEMENT_CHANNEL_ID,
  DISCORD_PLAYER_ROLE_ID,
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
      .setTitle("🐞 New Bug Report Channel")
      .setColor(0xffcb05)
      .setDescription(
        `We’ve opened a new channel dedicated to reporting bugs in our **entire environment**. ` +
          `This includes the **website, mods, Discord server, and more**.\n\n` +
          `➡️ Head over to <#${DISCORD_WEBSITE_BUGS_CHANNEL_ID}> and help us squash bugs while earning rewards!`
      )
      .addFields(
        {
          name: "📝 How to Report",
          value:
            `1. Go to <#${DISCORD_WEBSITE_BUGS_CHANNEL_ID}>.\n` +
            `2. Create a post with a clear title (example: *"Login button broken on mobile"*).\n` +
            `3. Include details: where it happened, steps to reproduce, screenshots if possible.\n\n` +
            `The clearer your report, the faster we can fix it`,
        },
        {
          name: "Rewards",
          value:
            `Each valid bug report earns you **in-game currency** based on severity:\n\n` +
            `🔹 Minor Severity → +$20\n` +
            `🔸 Medium Severity → +$50\n` +
            `💥 Fatal Severity → +$100\n\n` +
            `Rewards will be delivered **in-game** after verification.`,
        },
        {
          name: "Why?",
          value:
            `Because your feedback keeps our environment stable and fun.` +
            `and we want to reward those who help make it better.`,
        }
      )
      .setFooter({ text: "Thanks for playing on Createrington!" })
      .setTimestamp();

    await channel.send({
      content: `<@&${DISCORD_PLAYER_ROLE_ID}>`,
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
