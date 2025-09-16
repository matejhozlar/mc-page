import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
} from "discord.js";

/**
 * Create a reusable review session that:
 * - Sends embeds to a test channel with Accept/Decline buttons
 * - On Accept: forwards to announcement channel
 * - On Decline: deletes or disables buttons
 * - Shuts down when done (configurable)
 *
 * @param {import("discord.js").Client} client
 * @param {{
 *   guildId: string,
 *   testChannelId: string,
 *   announceChannelId: string,
 *   stopOnFirstAction?: boolean,
 *   autoShutdownMinutes?: number,
 *   canReview?: (interaction: import("discord.js").ButtonInteraction) => boolean | Promise<boolean>,
 *   customIdPrefix?: string,
 *   onShutdown?: () => Promise<void> | void
 * }} opts
 */
export function initReviewFlow(client, opts) {
  const {
    guildId,
    testChannelId,
    announceChannelId,
    stopOnFirstAction = false,
    autoShutdownMinutes = 0,
    canReview,
    customIdPrefix = "review",
    onShutdown,
  } = opts;

  let pendingCount = 0;
  const processedMessageIds = new Set();
  let interactionHandlerBound = false;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_accept`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_decline`)
      .setLabel("Decline")
      .setStyle(ButtonStyle.Danger)
  );

  async function markReviewed(interaction, statusText) {
    const msg = interaction.message;
    const rows = msg.components.map((r) => {
      const disabled = r.components.map((c) =>
        ButtonBuilder.from(c).setDisabled(true)
      );
      return new ActionRowBuilder().addComponents(disabled);
    });

    const embeds = msg.embeds.map((e) => EmbedBuilder.from(e));
    if (statusText) {
      const reviewer = interaction.user?.tag ?? "Reviewer";
      embeds.forEach((em) =>
        em.setFooter({ text: `${statusText} by ${reviewer}` })
      );
    }

    await msg.edit({ embeds, components: rows }).catch(() => {});
  }

  async function shutdown() {
    try {
      onShutdown && (await onShutdown());
    } catch {}
    try {
      client.destroy();
    } catch {}
    setTimeout(() => process.exit(0), 250);
  }

  function maybeFinish() {
    if (stopOnFirstAction) return shutdown();
    if (pendingCount <= 0) return shutdown();
  }

  async function postForReview(embedsArray) {
    const guild = await client.guilds.fetch(guildId);
    const testChannel = await guild.channels.fetch(testChannelId);

    const sent = await testChannel.send({
      embeds: embedsArray,
      components: [row],
      allowedMentions: { parse: ["users"] },
    });

    pendingCount += 1;
    return sent;
  }

  if (!interactionHandlerBound) {
    client.on(Events.InteractionCreate, async (interaction) => {
      try {
        if (!interaction.isButton()) return;
        if (
          interaction.customId !== `${customIdPrefix}_accept` &&
          interaction.customId !== `${customIdPrefix}_decline`
        )
          return;

        if (canReview) {
          const ok = await canReview(interaction);
          if (!ok) {
            return interaction.reply({
              content: "No permission to review.",
              ephemeral: true,
            });
          }
        }

        const msgId = interaction.message.id;
        if (processedMessageIds.has(msgId)) {
          return interaction.deferUpdate().catch(() => {});
        }
        processedMessageIds.add(msgId);

        const guild = await client.guilds.fetch(guildId);

        if (interaction.customId === `${customIdPrefix}_accept`) {
          const announceChannel = await guild.channels.fetch(announceChannelId);
          const embeds = interaction.message.embeds.map((e) =>
            EmbedBuilder.from(e)
          );
          await announceChannel.send({
            embeds,
            allowedMentions: { parse: ["users"] },
          });
          await interaction.deferUpdate().catch(() => {});
          await markReviewed(interaction, "Approved");
        }

        if (interaction.customId === `${customIdPrefix}_decline`) {
          await interaction.deferUpdate().catch(() => {});
          await interaction.message.delete().catch(async () => {
            await markReviewed(interaction, "Declined");
          });
        }

        pendingCount = Math.max(0, pendingCount - 1);
        maybeFinish();
      } catch (err) {
        console.error("ReviewFlow interaction error:", err);
        if (
          interaction.isRepliable() &&
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction
            .reply({
              content: "Something went wrong handling that action.",
              ephemeral: true,
            })
            .catch(() => {});
        }
      }
    });
    interactionHandlerBound = true;
  }

  if (autoShutdownMinutes > 0) {
    setTimeout(() => shutdown(), autoShutdownMinutes * 60 * 1000);
  }

  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => shutdown());
  }

  return { postForReview, shutdown };
}
