import express from "express";
import logger from "../../logger.js";

export default function marketRoutes(db) {
  const router = express.Router();

  // GET --- /api/market/me ---
  router.get("/market/me", async (req, res) => {
    const discordId = req.cookies.user_session;
    if (!discordId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const userResult = await db.query(
        `SELECT uuid, name, discord_id, last_seen
         FROM users
         WHERE discord_id = $1
         LIMIT 1`,
        [discordId]
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userResult.rows[0];

      const fundsResult = await db.query(
        `SELECT balance FROM user_funds WHERE uuid = $1 LIMIT 1`,
        [user.uuid]
      );

      const balance = fundsResult.rows[0]?.balance ?? 0;

      const companiesResult = await db.query(
        `SELECT 
           c.id,
           c.name,
           c.description,
           c.created_at,
           cm.role,
           (
             SELECT COUNT(*) FROM shops s WHERE s.company_id = c.id
           ) AS shop_count,
           (
             SELECT ARRAY_AGG(url ORDER BY position)
             FROM company_images
             WHERE company_id = c.id AND type = 'logo'
             LIMIT 1
           ) AS image_urls
         FROM companies c
         JOIN company_members cm ON cm.company_id = c.id
         WHERE cm.user_uuid = $1`,
        [user.uuid]
      );

      const company_count = companiesResult.rowCount;
      const max_companies = 3;

      const companyIds = companiesResult.rows.map((c) => c.id);

      let shops = [];

      if (companyIds.length > 0) {
        const shopsResult = await db.query(
          `SELECT 
          s.id,
          s.name,
          s.description,
          s.is_paid,
          s.created_at,
          s.company_id,
          c.name AS company_name,
          (
            SELECT ARRAY_AGG(url ORDER BY position)
            FROM shop_images
            WHERE shop_id = s.id AND type = 'logo'
            LIMIT 1
          ) AS image_urls
        FROM shops s
        JOIN companies c ON s.company_id = c.id
        WHERE s.company_id = ANY($1::int[])`,
          [companyIds]
        );

        shops = shopsResult.rows;
      }

      res.json({
        ...user,
        balance,
        company_count,
        max_companies,
        companies: companiesResult.rows,
        shops,
      });
    } catch (err) {
      logger.error(`❌ /market/me error: ${err}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/market/companies
  router.post("/market/companies", async (req, res) => {
    const discordId = req.cookies.user_session;
    const { name, description } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (!name || typeof name !== "string")
      return res.status(400).json({ error: "Invalid name" });

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      const {
        rows: [company],
      } = await db.query(
        `INSERT INTO companies (founder_uuid, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
        [user.uuid, name.trim(), description || ""]
      );

      await db.query(
        `INSERT INTO company_members (user_uuid, company_id, role)
       VALUES ($1, $2, 'Founder')`,
        [user.uuid, company.id]
      );

      await db.query(
        `INSERT INTO company_funds (company_id, balance) VALUES ($1, 0)`,
        [company.id]
      );

      res.status(201).json(company);
    } catch (err) {
      logger.error(`❌ Failed to create company: ${err}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/market/company/:id
  router.get("/market/company/:id", async (req, res) => {
    const companyId = parseInt(req.params.id, 10);

    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    try {
      const {
        rows: [company],
      } = await db.query(
        `SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        u.name AS founder_name,
        (
          SELECT COUNT(*) FROM shops WHERE company_id = c.id
        ) AS shop_count,
        (
           SELECT url
           FROM company_images
           WHERE company_id = c.id AND type = 'logo'
          ORDER BY position
          LIMIT 1
        ) AS logo_url,
         (
          SELECT url
          FROM company_images
           WHERE company_id = c.id AND type = 'banner'
           ORDER BY position
           LIMIT 1
         ) AS banner_url
       FROM companies c
      JOIN users u ON c.founder_uuid = u.uuid
      WHERE c.id = $1
      LIMIT 1`,
        [companyId]
      );

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      res.json(company);
    } catch (err) {
      logger.error(`❌ Failed to fetch company ${req.params.id}: ${err}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/market/company/:id/balance
  router.get("/market/company/:id/balance", async (req, res) => {
    const companyId = parseInt(req.params.id, 10);

    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    try {
      const {
        rows: [row],
      } = await db.query(
        `SELECT balance FROM company_funds WHERE company_id = $1`,
        [companyId]
      );

      if (!row) {
        return res.status(404).json({ error: "Balance not found" });
      }

      res.json({ company_id: companyId, balance: parseFloat(row.balance) });
    } catch (err) {
      logger.error(
        `❌ Failed to fetch balance for company ${companyId}: ${err}`
      );
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/market/company/:id/balance/history
  router.get("/market/company/:id/balance/history", async (req, res) => {
    const companyId = parseInt(req.params.id, 10);

    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    try {
      const { rows } = await db.query(
        `SELECT balance, recorded_at
         FROM company_balance_history
         WHERE company_id = $1
         ORDER BY recorded_at ASC`,
        [companyId]
      );

      res.json({
        company_id: companyId,
        history: rows.map((row) => ({
          balance: parseFloat(row.balance),
          recorded_at: row.recorded_at,
        })),
      });
    } catch (err) {
      logger.error(
        `❌ Failed to fetch balance history for company ${companyId}: ${err}`
      );
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/market/company/:id/members
  router.get("/market/company/:id/members", async (req, res) => {
    const companyId = parseInt(req.params.id, 10);

    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    try {
      const { rows } = await db.query(
        `SELECT 
        u.uuid,
        u.name,
        u.discord_id,
        cm.role,
        cm.joined_at
       FROM company_members cm
       JOIN users u ON cm.user_uuid = u.uuid
       WHERE cm.company_id = $1
       ORDER BY cm.role = 'Founder' DESC, cm.joined_at ASC`,
        [companyId]
      );

      res.json({
        company_id: companyId,
        members: rows,
      });
    } catch (err) {
      logger.error(
        `❌ Failed to fetch members for company ${companyId}: ${err}`
      );
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
