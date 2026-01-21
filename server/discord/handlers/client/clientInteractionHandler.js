import { MessageFlags } from "discord.js";
import logger from "../../../logger.js";
import db from "../../../db/index.js";
import { handleWaitlistButton } from "./waitlistButtons.js";
import submitScreenshot from "./submitScreenshot.js";

export default function registerClientInteractionHandler(
  client,
  commandHandlers,
  ticketHandlers,
) {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = commandHandlers.get(interaction.commandName);
      if (!command) {
        logger.warn(`Unknown command received: /${interaction.commandName}`);
        return;
      }
      logger.info(
        `${interaction.user.tag} (${interaction.user.id}) ran /${interaction.commandName}`,
      );
      try {
        await command.execute(interaction, db);
      } catch (error) {
        logger.error(
          `Error executing command ${interaction.commandName}:`,
          error,
        );
        await interaction.reply({
          content: "❌ Command failed.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    if (interaction.isButton()) {
      const handled = await handleWaitlistButton(interaction, db);
      if (handled) return;

      if (interaction.customId === "submit_screenshot") {
        try {
          await submitScreenshot(interaction, client, db);
        } catch (error) {
          logger.error("Error handling screenshot submission:", error);
          await interaction.reply({
            content: "❌ Something went wrong.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }

      const handler = ticketHandlers.get(interaction.customId);
      if (!handler) return;

      try {
        await handler(interaction, client, db);
      } catch (error) {
        logger.error(`Error handling button "${interaction.customId}":`, error);
        await interaction.reply({
          content: "❌ Something went wrong.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  });
}
