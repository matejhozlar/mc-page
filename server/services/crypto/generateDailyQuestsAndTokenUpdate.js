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
  try {
    const { rows: quests } = await db.query(
      `SELECT * FROM daily_shared_quests`
    );
    const completedQuests = quests.filter(
      (q) => q.progress_count >= q.target_count
    );
    const completionRatio = completedQuests.length / 3;

    const { rows: playtimeRows } = await db.query(
      `SELECT uuid, seconds_played FROM daily_playtime`
    );
    const rewards = [];

    for (const row of playtimeRows) {
      const playHours = row.seconds_played / 3600;
      const baseReward = Math.min((playHours / 3) * 100, 100);
      const finalReward = baseReward * completionRatio;

      if (finalReward > 0) {
        const { rows: userRows } = await db.query(
          `SELECT name FROM users WHERE uuid = $1`,
          [row.uuid]
        );
        if (userRows.length > 0) {
          rewards.push({
            uuid: row.uuid,
            name: userRows[0].name,
            tokens: Number(finalReward.toFixed(2)),
          });
        }
      }
    }

    if (rewards.length > 0) {
      const rewardChannel = await discordClient.channels.fetch(channelId);
      const rewardEmbed = new EmbedBuilder()
        .setTitle("🏅 Rewards for Yesterday")
        .setColor("#27ae60")
        .setDescription(
          "Here are the token rewards distributed for yesterday's efforts:"
        )
        .setTimestamp();

      for (const reward of rewards) {
        rewardEmbed.addFields({
          name: reward.name,
          value: `+${reward.tokens} ${tokenSymbol}`,
          inline: true,
        });
      }

      await rewardChannel.send({ embeds: [rewardEmbed] });
    }

    let totalPlaytime = playtimeRows.reduce(
      (acc, row) => acc + row.seconds_played / 3600,
      0
    );
    const { rows: tokenRows } = await db.query(
      `SELECT * FROM crypto_tokens WHERE symbol = $1 LIMIT 1`,
      [tokenSymbol]
    );
    if (tokenRows.length === 0)
      throw new Error(`Token ${tokenSymbol} not found.`);

    const token = tokenRows[0];
    let currentPrice = Number(token.price_per_unit);
    let availableSupply = Number(token.available_supply);

    if (isNaN(availableSupply)) {
      throw new Error(`Token ${tokenSymbol} has invalid available_supply`);
    }

    let newPrice;

    if (completedQuests.length === 0) {
      newPrice = Math.max(currentPrice * 0.9, 1);
    } else {
      const bonus = Math.min(
        0.15 * completionRatio * Math.min(totalPlaytime / 8, 1),
        0.15
      );
      newPrice = currentPrice + bonus;
    }

    newPrice = Math.min(Math.max(newPrice, 1), 5);
    newPrice = Number(newPrice.toFixed(6));

    await db.query(
      `UPDATE crypto_tokens SET price_per_unit = $1 WHERE id = $2`,
      [newPrice, token.id]
    );

    let remainingSupply = availableSupply;

    for (const reward of rewards) {
      if (reward.tokens > remainingSupply) {
        logger.warn(
          `⚠️ Skipping reward for ${reward.name}, insufficient supply.`
        );
        continue;
      }

      const { rows: userRows } = await db.query(
        `SELECT discord_id FROM users WHERE uuid = $1`,
        [reward.uuid]
      );

      if (!userRows.length) {
        logger.warn(`⚠️ Could not find discord_id for uuid: ${reward.uuid}`);
        continue;
      }

      const discordId = userRows[0].discord_id;

      await db.query(
        `INSERT INTO user_tokens (discord_id, token_id, amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (discord_id, token_id)
         DO UPDATE SET amount = user_tokens.amount + EXCLUDED.amount`,
        [discordId, token.id, reward.tokens]
      );
      if (reward.tokens > 0) {
        await db.query(
          `UPDATE crypto_tokens SET available_supply = available_supply - $1 WHERE id = $2`,
          [reward.tokens, token.id]
        );
      }
      remainingSupply -= reward.tokens;
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
        `INSERT INTO daily_shared_quests (quest_type, quest_key, target_count, description)
         VALUES ($1, $2, $3, $4)`,
        [quest_type, quest_key, target_count, description]
      );

      embed.addFields({
        name: `🗡️ ${description}`,
        value: `Progress: \`0 / ${target_count}\``,
        inline: false,
      });
    }

    const sentMsg = await questChannel.send({ embeds: [embed] });

    await db.query(
      `UPDATE daily_shared_quests SET discord_message_id = $1 WHERE discord_message_id IS NULL`,
      [sentMsg.id]
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
