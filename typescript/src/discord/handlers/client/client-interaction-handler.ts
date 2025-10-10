import type {
  Client,
  ChatInputCommandInteraction,
  ButtonInteraction,
  Interaction,
} from "discord.js";
import logger from "../../../logger";
import db from "../../../db";
import { handleWaitlistButton } from "./waitlist-buttons";
import type { TicketAction, TicketHandler } from "./ticket/index";

export interface SlashCommand {
  execute: (interaction: ChatInputCommandInteraction, db: any) => Promise<void>;
}

export function registerClientInteractionHandler(
  client: Client,
  commandHandlers: Map<string, SlashCommand>,
  ticketHandlers: Map<TicketAction, TicketHandler>
): void {
  client.on("interactionCreate", async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = commandHandlers.get(interaction.commandName);
      if (!command) {
        logger.warn(`Unknown command received: /${interaction.commandName}`);
        return;
      }

      logger.info(
        `${interaction.user.tag} (${interaction.user.id}) ran /${interaction.commandName}`
      );

      try {
        await command.execute(interaction, db);
      } catch (error) {
        logger.error(
          `Error executing command ${interaction.commandName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        await safeReply(interaction, {
          content: "❌ Command failed.",
          ephemeral: true,
        });
      }
      return;
    }

    if (interaction.isButton()) {
      const handled = await handleWaitlistButton(
        interaction as ButtonInteraction,
        db
      );
      if (handled) return;

      const handler = ticketHandlers.get(interaction.customId as TicketAction);
      if (!handler) return;

      try {
        await handler(interaction, client, db);
      } catch (error) {
        logger.error(
          `Error handling button "${interaction.customId}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        await safeReply(interaction, {
          content: "❌ Something went wrong.",
          ephemeral: true,
        });
      }
    }
  });
}

export default registerClientInteractionHandler;

async function safeReply(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  opts: { content: string; ephemeral?: boolean }
): Promise<void> {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply(opts);
    } else {
      await interaction.followUp(opts);
    }
  } catch {}
}
