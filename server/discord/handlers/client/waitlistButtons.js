import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import logger from "../../../logger.js";
import { isAdmin } from "../../../app/utils/admin/admin.js";
import { sendInviteById } from "../../../app/utils/admin/sendInvite.js";
import { exitIfNotProduction } from "../../../utils/production/onlyInProduction.js";

/**
 * Handle waitlist button interactions: waitlist:accept:<id>, waitlist:decline:<id>
 */
export async function handleWaitlistButton(interaction, db) {
  if (!exitIfNotProduction()) {
    return false;
  }

  const [ns, action, rawId] = (interaction.customId || "").split(":");
  if (ns !== "waitlist") return false;

  const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
  const hasRole = ADMIN_ROLE_ID
    ? interaction.member?.roles?.cache?.has(ADMIN_ROLE_ID)
    : false;

  let inDb = false;
  try {
    inDb = await isAdmin(db, interaction.user.id);
  } catch {}

  if (!hasRole && !inDb) {
    await interaction.reply({
      content: "You must be an admin to do that.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (!interaction.replied && !interaction.deferred) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const disableNonLinkButtons = () => {
    return interaction.message.components.map((row) => {
      const newRow = ActionRowBuilder.from(row);
      newRow.components = newRow.components.map((c) => {
        const btn = ButtonBuilder.from(c);
        if (btn.data.style !== ButtonStyle.Link) btn.setDisabled(true);
        return btn;
      });
      return newRow;
    });
  };

  try {
    if (action === "accept") {
      const result = await sendInviteById(db, rawId, process.env);
      if (!result?.ok) {
        await interaction.editReply(
          `Could not send invite: ${result?.msg || "Unknown error"}`
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
    logger.error("Waitlist button handler error:", error);
    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply("There was an error handling that action.");
      }
    } catch {}
    return true;
  }
}
