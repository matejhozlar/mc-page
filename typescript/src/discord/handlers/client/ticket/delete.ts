import {
  EmbedBuilder,
  type ButtonInteraction,
  type Client,
  type Snowflake,
} from "discord.js";
import type { Pool, PoolClient } from "pg";

type Db = Pool | PoolClient;
/**
 * Deletes a ticket channel after a short delay and marks it as deleted in the database.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The interaction that triggered the deletion.
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {import('pg').Pool | import('pg').PoolClient} db - The database connection or client.
 */
function canDeleteChannel(ch: unknown): ch is {
  id: Snowflake;
  deletable: boolean;
  delete: () => Promise<unknown>;
  send?: (args: any) => any;
} {
  return (
    !!ch &&
    typeof (ch as any).delete === "function" &&
    "deletable" in (ch as any)
  );
}

export default async function deleteTicket(
  interaction: ButtonInteraction,
  _client: Client,
  db: Db
): Promise<void> {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }

    const channel = interaction.channel;

    if (!channel) {
      return;
    }

    const channelId = channel.id as Snowflake;

    const embed = new EmbedBuilder()
      .setDescription("Ticket will be deleted in a few seconds")
      .setColor(0xed4245);

    if ("send" in channel && typeof (channel as any).send === "function") {
      await (channel as any).send({ embeds: [embed] }).catch(() => {});
    }

    await db.query(
      `UPDATE tickets
         SET status = 'deleted',
             updated_at = NOW()
       WHERE channel_id = $1`,
      [channelId]
    );

    setTimeout(() => {
      if (canDeleteChannel(channel) && channel.deletable) {
        channel.delete().catch(() => {});
      }
    }, 5_000);
  } catch (error) {}
}
