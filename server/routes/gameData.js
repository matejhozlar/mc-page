import express from "express";
import logger from "../logger.js";
import logError from "../utils/logError.js";
import calculateOfflineEarnings from "../utils/calculateOfflineEarnings.js";

export default function gameDataRoutes(db) {
  const router = express.Router();

  // --- GET /game-data ---
  router.get("/game-data", async (req, res) => {
    const discordId = req.cookies.user_session;
    if (!discordId) return res.status(401).json({ error: "Unauthorized" });

    const SMELTING_RECIPES = {
      copper_ore: { output: "copper_ingot", amount: 1, inputAmount: 1 },
      iron_ore: { output: "iron_ingot", amount: 1, inputAmount: 1 },
      gold_ore: { output: "gold_ingot", amount: 1, inputAmount: 1 },
      netherite_ore: { output: "netherite_ingot", amount: 1, inputAmount: 4 },
    };

    try {
      const { rows } = await db.query(
        `SELECT * FROM clicker_game_data WHERE discord_id = $1`,
        [discordId]
      );
      if (!rows[0]) return res.json(null);

      const data = rows[0];
      const now = new Date();
      const last = data.last_logout_at
        ? new Date(data.last_logout_at)
        : new Date(data.updated_at);
      const elapsed = now - last;

      let { materials, coal_reserve, smelting_queue } = data;
      materials = { ...materials };
      coal_reserve = Number(coal_reserve);
      let queue = Array.isArray(smelting_queue) ? [...smelting_queue] : [];
      const level = data.furnace_level || 0;
      const recipes = SMELTING_RECIPES;
      const summary = {};

      if (level > 0 && queue.length > 0 && coal_reserve >= 0.25) {
        const smeltRate = 5000 / level;
        const maxByTime = Math.floor(elapsed / smeltRate);
        const maxByCoal = Math.floor(coal_reserve / 0.25);
        const toSmeltCount = Math.min(queue.length, maxByTime, maxByCoal);

        for (let i = 0; i < toSmeltCount; i++) {
          const ore = queue.shift();
          const r = recipes[ore];
          if (!r) continue;

          materials[ore] -= r.inputAmount;
          materials[r.output] = (materials[r.output] || 0) + r.amount;
          coal_reserve -= 0.25;
          summary[r.output] = (summary[r.output] || 0) + r.amount;
        }

        await db.query(
          `UPDATE clicker_game_data
           SET materials = $1::jsonb,
               coal_reserve = $2,
               smelting_queue = $3::jsonb,
               last_logout_at = now()
           WHERE discord_id = $4`,
          [
            JSON.stringify(materials),
            coal_reserve,
            JSON.stringify(queue),
            discordId,
          ]
        );
      }

      queue = Array.isArray(queue) ? queue : [];

      const earnings = calculateOfflineEarnings({
        logoutTime: data.last_logout_at,
        currentTime: now.getTime(),
        autoClickLevel: data.auto_click_level,
        offlineEarningsLevel: data.offline_earnings_level,
        tool: data.tool,
      });

      if (earnings) {
        data.points += earnings.points;

        for (const [mat, amt] of Object.entries(earnings.materials)) {
          materials[mat] = (materials[mat] || 0) + amt;
        }

        await db.query(
          `UPDATE clicker_game_data
     SET points = $1,
         materials = $2::jsonb,
         last_logout_at = null
     WHERE discord_id = $3`,
          [data.points, JSON.stringify(materials), discordId]
        );

        data.offline_earned = {
          points: earnings.points,
          materials: earnings.materials,
          minutes: earnings.minutes,
        };
      }

      return res.json({
        ...data,
        materials,
        coal_reserve,
        smelting_queue: queue,
        offline_smelted: summary,
        offline_earned: data.offline_earned || null,
      });
    } catch (error) {
      logger.error(`❌ Failed to fetch game data: ${logError(error)}`);
      return res.status(500).json({ error: "Failed to load game data" });
    }
  });

  // --- POST /game-data ---
  router.post("/game-data", async (req, res) => {
    const discordId = req.cookies.user_session;
    if (!discordId) return res.status(401).json({ error: "Unauthorized" });

    const {
      points,
      tool,
      inventory,
      materials,
      auto_click_level,
      furnace_level,
      coal_reserve,
      smelting_queue,
      smelt_amounts,
    } = req.body;

    if (
      typeof furnace_level !== "number" ||
      typeof coal_reserve !== "number" ||
      !Array.isArray(inventory) ||
      !Array.isArray(smelting_queue) ||
      typeof smelt_amounts !== "object"
    ) {
      return res.status(400).json({ error: "Invalid game data" });
    }

    const materialsJson = JSON.stringify(materials);
    const queueJson = JSON.stringify(smelting_queue);
    const smeltAmountsJson = JSON.stringify(smelt_amounts);

    try {
      await db.query(
        `INSERT INTO clicker_game_data
           (discord_id, points, tool, inventory, materials, auto_click_level,
            furnace_level, coal_reserve, smelting_queue, smelt_amounts, last_logout_at)
         VALUES
           ($1, $2, $3, $4, $5::jsonb, $6,
            $7, $8, $9::jsonb, $10::jsonb, now())
         ON CONFLICT (discord_id) DO UPDATE SET
           points = EXCLUDED.points,
           tool = EXCLUDED.tool,
           inventory = EXCLUDED.inventory,
           materials = EXCLUDED.materials,
           auto_click_level = EXCLUDED.auto_click_level,
           furnace_level = EXCLUDED.furnace_level,
           coal_reserve = EXCLUDED.coal_reserve,
           smelting_queue = EXCLUDED.smelting_queue,
           smelt_amounts = EXCLUDED.smelt_amounts,
           updated_at = now()
        `,
        [
          discordId,
          points,
          tool,
          inventory,
          materialsJson,
          auto_click_level,
          furnace_level,
          coal_reserve,
          queueJson,
          smeltAmountsJson,
        ]
      );
      return res.json({ success: true });
    } catch (error) {
      logger.error(`❌ Failed to save game data: ${logError(error)}`);
      return res.status(500).json({ error: "Failed to save game data" });
    }
  });

  // --- POST /game-logout ---
  router.post("/game-logout", async (req, res) => {
    logger.info(`🕒 Received logout beacon for: ${req.cookies.user_session}`);
    const discordId = req.cookies.user_session;
    if (!discordId) return res.sendStatus(401);

    try {
      await db.query(
        `UPDATE clicker_game_data
         SET last_logout_at = now()
         WHERE discord_id = $1`,
        [discordId]
      );
      return res.sendStatus(204);
    } catch (error) {
      logger.error(`Failed to mark logout: ${error}`);
      return res.sendStatus(500);
    }
  });

  return router;
}
