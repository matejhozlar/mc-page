import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
} from "discord.js";
/**
 * Initiates the ticket close confirmation by sending a message with confirmation buttons.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The interaction triggered by the user clicking the "Close" button.
 */
export default async function startCloseTicket(
  interaction: ButtonInteraction
): Promise<void> {
  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_close_ticket")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cancel_close_ticket")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }

  const ch = interaction.channel;
  if (ch && "send" in ch && typeof (ch as any).send === "function") {
    await (ch as any).send({
      content: "⚠️ Are you sure you want to close this ticket?",
      components: [confirmRow],
    });
  }
}
