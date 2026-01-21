import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import logger from "../../logger.js";
import config from "../../config/index.js";

const { DARK_GRAY } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("screenshot-contest")
  .setDescription("Post the screenshot contest announcement (admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const prodOnly = false;

export async function execute(interaction, db) {
  try {
    const embed = new EmbedBuilder()
      .setTitle("📸 Screenshot Contest")
      .setDescription(
        "Show us your best moments from Createrington! Submit your most creative, impressive, or funny screenshots for a chance to win in-game currency and get featured on our website.",
      )
      .setColor(DARK_GRAY)
      .addFields(
        {
          name: "🏆 1st Place",
          value: "$2,000 in-game currency",
          inline: true,
        },
        {
          name: "🥈 2nd Place",
          value: "$1,500 in-game currency",
          inline: true,
        },
        {
          name: "🥉 3rd Place",
          value: "$1,000 in-game currency",
          inline: true,
        },
        {
          name: "📋 Rules",
          value:
            "• Must be from Createrington server\n" +
            "• Maximum 3 screenshots per person\n" +
            "• No editing or filters\n" +
            "• Original content only",
          inline: false,
        },
        {
          name: "🎯 How to Enter",
          value:
            "Click the **📸 Submit Screenshot** button below. A private thread will be created where you can upload your screenshots and add descriptions.",
          inline: false,
        },
      )
      .setFooter({
        text: "Winners' photos will be featured on create-rington.com!",
      })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("submit_screenshot")
      .setLabel("📸 Submit Screenshot")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: "✅ Screenshot contest announcement posted!",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("Failed to post screenshot contest:", error);
    await interaction.reply({
      content: "❌ Failed to post announcement.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
