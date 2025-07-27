import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

/**
 * Initiates the ticket close confirmation by sending a message with confirmation buttons.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The interaction triggered by the user clicking the "Close" button.
 */
export default async function startCloseTicket(interaction) {
  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_close_ticket")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cancel_close_ticket")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.deferUpdate();

  await interaction.channel.send({
    content: "⚠️ Are you sure you want to close this ticket?",
    components: [confirmRow],
  });
}
