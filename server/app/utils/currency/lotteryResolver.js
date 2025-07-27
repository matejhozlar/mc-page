import logger from "../../../logger.js";
import { setTimeout as sleep } from "timers/promises";
import { announceLotteryWinner } from "./announceLotteryWinner.js";
import { announceLotteryRefund } from "./announceLotteryRefund.js";

/**
 * Resolves a lottery after a delay, choosing a winner or refunding participants.
 *
 * @param {import('pg').Pool} db - The PostgreSQL connection pool.
 * @param {import('discord.js').Client} webChatClient - The Discord bot client used for sending announcements.
 * @param {number} [waitMs=120000] - Optional delay before resolving the lottery in milliseconds (default is 2 minutes).
 * @returns {Promise<void>}
 */
export async function startLotteryResolver(db, webChatClient, waitMs = 120000) {
  logger.info("🎲 Lottery resolver started. Waiting...");

  await sleep(waitMs);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT uuid, name, amount FROM lottery_participants`
    );

    if (result.rowCount < 2) {
      logger.warn(
        "❌ Lottery cancelled (not enough participants). Refunding..."
      );
      for (const p of result.rows) {
        await client.query(
          `UPDATE user_funds SET balance = balance + $1 WHERE uuid = $2`,
          [p.amount, p.uuid]
        );
      }
      await client.query(`DELETE FROM lottery_participants`);
      await client.query("COMMIT");
      const only = result.rows[0];
      await announceLotteryRefund(webChatClient, only.name, only.amount);
      return;
    }

    const total = result.rows.reduce((sum, p) => sum + p.amount, 0);
    const rand = Math.random() * total;
    let cumulative = 0;
    let winner = null;

    for (const p of result.rows) {
      cumulative += p.amount;
      if (rand <= cumulative) {
        winner = p;
        break;
      }
    }

    if (!winner) throw new Error("Failed to pick winner");

    await client.query(
      `UPDATE user_funds SET balance = balance + $1 WHERE uuid = $2`,
      [total, winner.uuid]
    );

    await client.query(`DELETE FROM lottery_participants`);

    await client.query("COMMIT");

    logger.info(`🏆 Lottery won by ${winner.name} who gets $${total}`);
    await announceLotteryWinner(webChatClient, winner.name, total);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(`❌ Lottery resolver failed: ${error}`);
  } finally {
    client.release();
  }
}
