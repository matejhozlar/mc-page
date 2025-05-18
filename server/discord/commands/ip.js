import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const userCooldowns = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;

export const data = new SlashCommandBuilder()
  .setName("ip")
  .setDescription("Get the Minecraft server IP and connection info");

export async function execute(interaction) {
  const userId = interaction.user.id;
  const now = Date.now();
  const lastUsed = userCooldowns.get(userId) || 0;
  const remaining = COOLDOWN_MS - (now - lastUsed);

  if (remaining > 0) {
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return await interaction.reply({
      content: `⏳ Please wait **${mins}m ${secs}s** before using this command again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  userCooldowns.set(userId, now);

  const embed = new EmbedBuilder()
    .setTitle("🌐 Createrington Server Info")
    .setColor(0x2f3136)
    .setDescription("Use the IP below to join the Minecraft server.")
    .addFields(
      {
        name: "🖥️ Server IP",
        value: "`create-rington.mcserv.fun`",
      },
      {
        name: "🎮 Version",
        value: "Minecraft Java 1.21.1",
      },
      {
        name: "❓ Need Help?",
        value: `[Open a support ticket](https://discord.com/channels/${interaction.guild.id}/${process.env.DISCORD_TICKET_MESSAGE_CHANNEL_ID})`,
      }
    )
    .setFooter({ text: "See you in-game!" });

  const connectButton = new ButtonBuilder()
    .setLabel("Visit Server Site")
    .setStyle(ButtonStyle.Link)
    .setURL("https://create-rington.com");

  const row = new ActionRowBuilder().addComponents(connectButton);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}
