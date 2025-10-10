import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type GuildMember,
  type Snowflake,
} from "discord.js";
import logger from "../../../logger";
import { isAdmin } from "../../../app/utils/admin/admin";
import { sendInviteById } from "../../../app/utils/admin/send-invite";
import { exitIfNotProduction } from "../../../utils/production/env-guard";
import type { Pool, PoolClient } from "pg";

type Db = Pool | PoolClient;

/**
 * Handle waitlist button interactions: waitlist:accept:<id>, waitlist:decline:<id>
 * Returns true if this handler processed the interaction (even on error),
 * false if the interaction was not a waitlist action.
 */
export async function handleWaitlistButton(
  interaction: ButtonInteraction,
  db: Db
): Promise<boolean> {
  if (!exitIfNotProduction()) return false;

  const [ns, action, rawId] = (interaction.customId ?? "").split(":");
  if (ns !== "waitlist") return false;

  const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID as
    | Snowflake
    | undefined;

  let hasRole = false;
  if (ADMIN_ROLE_ID && interaction.inGuild() && interaction.member) {
    try {
      const m = interaction.member as GuildMember;
      hasRole = m.roles.cache.has(ADMIN_ROLE_ID);
    } catch {
      hasRole = false;
    }
  }

  let inDb = false;
  try {
    inDb = await isAdmin(db, interaction.user.id);
  } catch {}

  if (!hasRole && !inDb) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: "You must be an admin to do that.",
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: "You must be an admin to do that.",
          ephemeral: true,
        });
      }
    } catch {}
    return true;
  }

  if (!interaction.replied && !interaction.deferred) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  }

  const disableNonLinkButtons = (): ActionRowBuilder<ButtonBuilder>[] => {
    return interaction.message.components.map((row) => {
      const actionRow = row as unknown as ActionRowBuilder<ButtonBuilder>;
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      for (const comp of actionRow.components) {
        const btn = ButtonBuilder.from(comp as any);
        if (btn.data.style !== ButtonStyle.Link) btn.setDisabled(true);
        newRow.addComponents(btn);
      }
      return newRow;
    });
  };

  try {
    if (action === "accept") {
      if (!rawId) {
        await interaction.editReply("Invalid waitlist ID.");
        return true;
      }
      const result = await sendInviteById(db, rawId, process.env);
      if (!result?.ok) {
        await interaction.editReply(
          `Could not send invite: ${result?.msg ?? "Unknown error"}`
        );
        return true;
      }

      await interaction.message.edit({
        components: disableNonLinkButtons(),
        content: `✅ Accepted by <@${interaction.user.id}>`,
        embeds: interaction.message.embeds,
      });

      await interaction.editReply("Invite sent successfully.");
      return true;
    }

    if (action === "decline") {
      await interaction.message.edit({
        components: disableNonLinkButtons(),
        content: `❌ Declined by <@${interaction.user.id}>`,
        embeds: interaction.message.embeds,
      });

      await interaction.editReply("Declined.");
      return true;
    }

    await interaction.editReply("Unknown action.");
    return true;
  } catch (error) {
    logger.error(
      `Waitlist button handler error: ${error instanceof Error ? error.message : String(error)}`
    );
    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply("There was an error handling that action.");
      }
    } catch {}
    return true;
  }
}

export default handleWaitlistButton;
