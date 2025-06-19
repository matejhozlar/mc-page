import { EmbedBuilder } from "discord.js";
import logger from "../logger.js";
import logError from "../utils/logError.js";

export async function updateQuestProgress(db, discordClient, channelId) {
  try {
    const { rows: quests } = await db.query(
      `SELECT * FROM daily_shared_quests`
    );

    let updatedAny = false;

    for (const quest of quests) {
      if (quest.progress_count >= quest.target_count) continue;

      const { rows } = await db.query(
        `
        SELECT SUM(value)::int AS total
        FROM daily_player_stats
        WHERE stat_type = $1 AND stat_key = $2 AND stat_date = CURRENT_DATE
        `,
        [quest.quest_type, quest.quest_key]
      );

      const newProgress = rows[0]?.total || 0;

      if (newProgress > quest.progress_count) {
        updatedAny = true;

        await db.query(
          `UPDATE daily_shared_quests SET progress_count = $1 WHERE id = $2`,
          [Math.min(newProgress, quest.target_count), quest.id]
        );
      }
    }

    if (!updatedAny) return;

    const { rows: updatedQuests } = await db.query(
      `SELECT * FROM daily_shared_quests`
    );

    const messageId = updatedQuests[0]?.discord_message_id;
    if (!messageId) return;

    const channel = await discordClient.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);

    const embed = new EmbedBuilder()
      .setTitle("🎯 Daily Shared Quests")
      .setColor("#f39c12")
      .setDescription("Complete the following quests today to earn PLC tokens!")
      .setTimestamp();

    for (const quest of updatedQuests) {
      embed.addFields({
        name: `🗡️ ${quest.description}`,
        value: `Progress: \`${Math.min(
          quest.progress_count,
          quest.target_count
        )} / ${quest.target_count}\``,
        inline: false,
      });
    }

    await message.edit({ embeds: [embed] });

    logger.info("🔄 Quest progress updated and embed refreshed.");
  } catch (error) {
    logger.error(`❌ updateQuestProgress failed: ${logError(error)}`);
  }
}
