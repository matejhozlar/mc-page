import type { ButtonInteraction } from "discord.js";
import logger from "../../../../logger";

export default async function cancelCloseTicket(
  interaction: ButtonInteraction
): Promise<void> {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }

    await interaction.message.delete();
  } catch (error) {
    logger.error("Failed to delete cancel confirmation message:", error);
  }
}
