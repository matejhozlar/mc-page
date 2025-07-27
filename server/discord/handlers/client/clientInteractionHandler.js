import { MessageFlags } from "discord.js";

import logger from "../../../logger.js";
import db from "../../../db/index.js";

/**
 * Registers interaction handling for the client bot
 * @param {import('discord.js'.Client)} client
 * @param {Map<string, object>} commandHandlers
 * @param {Map<string, Function>} ticketHandlers
 */
export default function registerClientInteractionHandler(
  client,
  commandHandlers,
  ticketHandlers
) {
  client.on("interactionCreate", async (interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = commandHandlers.get(interaction.commandName);
      if (!command) {
        logger.warn(`⚠️ Unknown command received: /${interaction.commandName}`);
        return;
      }

      logger.info(
        `📩 ${interaction.user.tag} (${interaction.user.id}) ran /${interaction.commandName}`
      );

      try {
        await command.execute(interaction, db);
      } catch (error) {
        logger.error(
          `❌ Error executing command ${interaction.commandName}:`,
          error
        );
        await interaction.reply({
          content: "❌ Command failed.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const handler = ticketHandlers.get(interaction.customId);
      if (!handler) return;

      try {
        await handler(interaction, client, db);
      } catch (error) {
        logger.error(
          `❌ Error handling button "${interaction.customId}": ${error}`
        );
        await interaction.reply({
          content: "❌ Something went wrong.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  });
}
