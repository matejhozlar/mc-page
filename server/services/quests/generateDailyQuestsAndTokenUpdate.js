import { questsPool } from "./data/questPool.js";
import { EmbedBuilder } from "discord.js";
import logger from "../../logger.js";
import config from "../../config/index.js";

/**
 * Handles daily quest generation, reward distribution, and token price adjustments.
 *
 * @param {import('pg').Pool} db - The PostgreSQL client/connection pool.
 * @param {import('discord.js').Client} discordClient - The Discord.js client instance.
 * @param {string} channelId - The Discord channel ID to send updates to.
 * @param {string} [tokenSymbol='PLC'] - The symbol of the token to reward players with.
 */

const {
  DAILY_QUEST_COUNT,
  MAX_BASE_REWARD,
  PRICE_PENALTY_MULTIPLIER,
  MAX_PRICE_BONUS,
  MAX_PLAYTIME_FOR_BONUS,
  MAX_PLC_PRICE,
  MIN_PLC_PRICE,
} = config.quests;

const { GREEN, ORANGE } = config.uiColors;

const SECONDS_IN_HOUR = 3600;
const PRICE_DECIMALS = 6;

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
    const completionRatio = completedQuests.length / DAILY_QUEST_COUNT;

    const { rows: playtimeRows } = await db.query(
      `SELECT uuid, seconds_played FROM daily_playtime`
    );
    const rewards = [];

    for (const row of playtimeRows) {
      const playHours = row.seconds_played / SECONDS_IN_HOUR;
      const baseReward = Math.min(
        (playHours / DAILY_QUEST_COUNT) * MAX_BASE_REWARD,
        MAX_BASE_REWARD
      );
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
        .setColor(GREEN)
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
      (acc, row) => acc + row.seconds_played / SECONDS_IN_HOUR,
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
      newPrice = Math.max(
        currentPrice * PRICE_PENALTY_MULTIPLIER,
        MIN_PLC_PRICE
      );
    } else {
      const bonus = Math.min(
        MAX_PRICE_BONUS *
          completionRatio *
          Math.min(totalPlaytime / MAX_PLAYTIME_FOR_BONUS, 1),
        MAX_PRICE_BONUS
      );
      newPrice = currentPrice + bonus;
    }

    newPrice = Math.min(Math.max(newPrice, MIN_PLC_PRICE), MAX_PLC_PRICE);
    newPrice = Number(newPrice.toFixed(PRICE_DECIMALS));

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

    const newQuests = pickRandomQuests(DAILY_QUEST_COUNT);
    const questChannel = await discordClient.channels.fetch(channelId);
    const embed = new EmbedBuilder()
      .setTitle("🎯 Daily Shared Quests")
      .setColor(ORANGE)
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
    logger.error(`❌ generateDailyQuestsAndTokenUpdate failed: ${error}`);
  }
}

/**
 * Picks a specified number of random quests from the quests pool.
 *
 * @param {number} count - Number of quests to select.
 * @returns {Array} - Array of selected quest objects.
 */
function pickRandomQuests(count) {
  const copy = [...questsPool];
  const shuffled = copy.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
