import dotenv from "dotenv";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID } = process.env;

// Winner Discord user IDs (placeholders)
const FIRST_PLACE_USER_ID = "219156655546302464";
const SECOND_PLACE_USER_ID = "478837715811565569";
const THIRD_PLACE_USER_ID = "1350936878358204558";
const FOURTH_PLACE_USER_ID = "1315758452420907131";

// Optional: put links to winning screenshots / threads (leave "" if not used)
const FIRST_PLACE_LINK =
  "https://discord.com/channels/1224344391125041284/1465622055725826068";
const SECOND_PLACE_LINK =
  "https://discord.com/channels/1224344391125041284/1465806932026589254";
const THIRD_PLACE_LINK =
  "https://discord.com/channels/1224344391125041284/1466174892075647178";
const FOURTH_PLACE_LINK =
  "https://discord.com/channels/1224344391125041284/1463645777476849896";

// Optional: small blurb at top
const ANNOUNCEMENT_TITLE = "📸 Screenshot Contest Winners!";
const ANNOUNCEMENT_DESCRIPTION =
  "Thanks to everyone who entered — we loved the creativity. Here are the winners! 🎉";

// Reward amounts
const PRIZE_1 = "$2,000 in-game currency";
const PRIZE_2 = "$1,500 in-game currency";
const PRIZE_3 = "$1,000 in-game currency";
const PRIZE_4 = "$500 in-game currency";

// Styling
const EMBED_COLOR = 0x00b0f4;
const FOOTER_TEXT =
  "Winners will be featured on create-rington.com in the future!";

const mention = (id) => `<@${id}>`;
const maybeLinkLine = (url) => (url && url.trim().length ? `\n🔗 ${url}` : "");

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID,
    );
    if (!channel?.isTextBased?.()) {
      throw new Error("Announcement channel is not a text-based channel.");
    }

    const embed = new EmbedBuilder()
      .setTitle(ANNOUNCEMENT_TITLE)
      .setColor(EMBED_COLOR)
      .setDescription(ANNOUNCEMENT_DESCRIPTION)
      .addFields(
        {
          name: "🏆 1st Place",
          value: `${mention(FIRST_PLACE_USER_ID)}\n**Prize:** ${PRIZE_1}${maybeLinkLine(
            FIRST_PLACE_LINK,
          )}`,
          inline: false,
        },
        {
          name: "🥈 2nd Place",
          value: `${mention(SECOND_PLACE_USER_ID)}\n**Prize:** ${PRIZE_2}${maybeLinkLine(
            SECOND_PLACE_LINK,
          )}`,
          inline: false,
        },
        {
          name: "🥉 3rd Place",
          value: `${mention(THIRD_PLACE_USER_ID)}\n**Prize:** ${PRIZE_3}${maybeLinkLine(
            THIRD_PLACE_LINK,
          )}`,
          inline: false,
        },
        {
          name: "🎖️ 4th Place",
          value: `${mention(FOURTH_PLACE_USER_ID)}\n**Prize:** ${PRIZE_4}${maybeLinkLine(
            FOURTH_PLACE_LINK,
          )}`,
          inline: false,
        },
      )
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("✅ Screenshot contest winners announcement sent!");
  } catch (err) {
    console.error("❌ Failed to send winners announcement:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
