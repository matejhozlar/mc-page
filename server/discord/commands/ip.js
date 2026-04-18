import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import logger from "../../logger.js";
import dotenv from "dotenv";
import config from "../../config/index.js";

dotenv.config();

const userCooldowns = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;
const { DARK_GRAY } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("ip")
  .setDescription("Get the Minecraft server IP and connection info");

export const prodOnly = true;

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const now = Date.now();
    const lastUsed = userCooldowns.get(userId) || 0;
    const remaining = COOLDOWN_MS - (now - lastUsed);

    if (remaining > 0) {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      return await interaction.reply({
        content: `⏳ Please wait ${minutes} minute(s) and ${seconds} second(s) before using this command again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    userCooldowns.set(userId, now);

    const embed = new EmbedBuilder()
      .setTitle("🌐 Createrington Server Info")
      .setColor(DARK_GRAY)
      .setDescription("Use the IP below to join the Minecraft server.")
      .addFields(
        {
          name: "🖥️ Server IP",
          value: "`createrington.mcserv.fun`",
        },
        {
          name: "🎮 Version",
          value: "Minecraft Java 1.21.1",
        },
        {
          name: "❓ Need Help?",
          value: `[Open a support ticket](https://discord.com/channels/${interaction.guild.id}/${process.env.DISCORD_TICKET_MESSAGE_CHANNEL_ID})`,
        },
      )
      .setFooter({ text: "See you in-game!" });

    const connectButton = new ButtonBuilder()
      .setLabel("Visit Server Site")
      .setStyle(ButtonStyle.Link)
      .setURL("https://createrington.com");

    const row = new ActionRowBuilder().addComponents(connectButton);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("/ip failed:", error);
    await interaction.reply({
      content: `⚠️ Something went wrong. Try again later.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
