import { DateTime } from "luxon";
import { questsPool } from "./data/questPool.js";
import { EmbedBuilder } from "discord.js";
import logError from "../../utils/logError.js";
import logger from "../../logger.js";

export async function generateDailyQuestsAndTokenUpdate(
  db,
  discordClient,
  channelId,
  tokenSymbol = "PLC"
) {
  const today = DateTime.now().setZone("Europe/Berlin").toISODate();

  try {
    const { rows: quests } = await db.query(
      `SELECT * FROM daily_shared_quests WHERE quest_date = $1`,
      [today]
    );

    const completedQuests = quests.filter(
      (q) => q.progress_count >= q.target_count
    );
    const completionRatio = completedQuests.length / 3;

    const { rows: playtimeRows } = await db.query(
      `SELECT uuid, seconds_played FROM daily_playtime WHERE play_date = $1`,
      [today]
    );

    let totalPlaytime = 0;
    const userTokenAllocations = [];

    for (const row of playtimeRows) {
      const playHours = row.seconds_played / 3600;
      totalPlaytime += playHours;
      const baseReward = Math.min((playHours / 3) * 100, 100);
      const finalReward = baseReward * completionRatio;

      if (finalReward > 0) {
        userTokenAllocations.push({ uuid: row.uuid, tokens: finalReward });
      }
    }

    const { rows: tokenRows } = await db.query(
      `SELECT * FROM crypto_tokens WHERE symbol = $1 LIMIT 1`,
      [tokenSymbol]
    );
    if (tokenRows.length === 0)
      throw new Error(`Token ${tokenSymbol} not found.`);

    const token = tokenRows[0];
    let newPrice = Number(token.price_per_unit);

    if (completedQuests.length === 0) {
      newPrice = Math.max(newPrice * 0.9, 1);
    } else {
      const bonus = Math.min(
        0.15 * completionRatio * Math.min(totalPlaytime / 8, 1),
        0.15
      );
      newPrice = newPrice + bonus;
    }

    newPrice = Math.min(Math.max(newPrice, 1), 5);
    newPrice = Number(newPrice.toFixed(6));

    await db.query(
      `UPDATE crypto_tokens SET price_per_unit = $1 WHERE id = $2`,
      [newPrice, token.id]
    );

    for (const user of userTokenAllocations) {
      await db.query(
        `INSERT INTO user_tokens (discord_id, token_id, amount)
         SELECT discord_id, $1, $2 FROM users WHERE uuid = $3
         ON CONFLICT (discord_id, token_id)
         DO UPDATE SET amount = user_tokens.amount + EXCLUDED.amount`,
        [token.id, user.tokens, user.uuid]
      );
    }

    await db.query(`DELETE FROM daily_shared_quests`);
    await db.query(`DELETE FROM daily_player_stats`);

    const newQuests = pickRandomQuests(3);
    const questChannel = await discordClient.channels.fetch(channelId);

    const embed = new EmbedBuilder()
      .setTitle("🎯 Daily Shared Quests")
      .setColor("#f39c12")
      .setDescription("Complete the following quests today to earn PLC tokens!")
      .setTimestamp();

    for (const quest of newQuests) {
      const { quest_type, quest_key, target_count, description } = quest;

      await db.query(
        `INSERT INTO daily_shared_quests (quest_date, quest_type, quest_key, target_count, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
        [today, quest_type, quest_key, target_count, description]
      );

      embed.addFields({
        name: `🗡️ ${description}`,
        value: `Progress: \`0 / ${target_count}\``,
        inline: false,
      });
    }

    const sentMsg = await questChannel.send({ embeds: [embed] });

    await db.query(
      `UPDATE daily_shared_quests SET discord_message_id = $1 WHERE quest_date = $2`,
      [sentMsg.id, today]
    );

    logger.info("✅ Daily quests and token updates complete.");
  } catch (error) {
    logger.error(
      `❌ generateDailyQuestsAndTokenUpdate failed: ${logError(error)}`
    );
  }
}

function pickRandomQuests(count) {
  const shuffled = questsPool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
