import { Client, GatewayIntentBits, EmbedBuilder, time } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_ANNOUNCEMENT_CHANNEL_ID } = process.env;

const announcement = {
  title: "🔧 Server Maintenance",
  description:
    "We’re rolling out a modpack and server update to improve stability, performance and add new mods",
  startsAt: new Date("2025-10-03T10:00:00+02:00"),
  estimatedMinutes: 120,
};

function formatRelativeTime(date) {
  const timestamp = Math.floor(date.getTime() / 1000);
  return `<t:${timestamp}:R>`;
}

function formatExactTime(date) {
  const timestamp = Math.floor(date.getTime() / 1000);
  return `<t:${timestamp}:f>`;
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(
      DISCORD_ANNOUNCEMENT_CHANNEL_ID
    );
    const endTime = new Date(
      announcement.startsAt.getTime() + announcement.estimatedMinutes * 60000
    );

    const embed = new EmbedBuilder()
      .setTitle(announcement.title)
      .setColor(0x57f287)
      .setDescription(announcement.description)
      .addFields(
        {
          name: "🕒 Starts",
          value: `${formatExactTime(
            announcement.startsAt
          )} (${formatRelativeTime(announcement.startsAt)})`,
        },
        {
          name: "⏳ Estimated Duration",
          value: `${announcement.estimatedMinutes} minutes`,
        },
        {
          name: "🔚 Expected End",
          value: `${formatExactTime(endTime)} (${formatRelativeTime(endTime)})`,
        }
      )
      .setFooter({ text: "Thanks for your patience!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Announcement sent!");
  } catch (error) {
    console.error("Failed to send announcement:", error);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
