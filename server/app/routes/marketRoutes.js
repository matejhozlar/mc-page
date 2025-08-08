import express from "express";
import { saveLocalImage } from "../utils/market/saveLocalImage.js";
import upload from "../middleware/multer.js";
import path from "path";
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
            c.short_description,
            c.created_at,
            cm.role,
            (
              SELECT COUNT(*) FROM shops s WHERE s.company_id = c.id
            ) AS shop_count,
            (
              SELECT balance FROM company_funds cf WHERE cf.company_id = c.id
            ) AS balance,
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
      logger.error(`❌ /market/me error: ${error}`);
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
    } catch (error) {
      logger.error(`❌ Failed to create company: ${error}`);
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
        c.short_description,
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
        ) AS banner_url,
        (
          SELECT ARRAY_AGG(url ORDER BY position)
          FROM company_images
          WHERE company_id = c.id AND type = 'gallery'
          LIMIT 5
        ) AS gallery_urls
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
    } catch (error) {
      logger.error(`❌ Failed to fetch company ${req.params.id}: ${error}`);
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
    } catch (error) {
      logger.error(
        `❌ Failed to fetch balance for company ${companyId}: ${error}`
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
    } catch (error) {
      logger.error(
        `❌ Failed to fetch balance history for company ${companyId}: ${error}`
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
    } catch (error) {
      logger.error(
        `❌ Failed to fetch members for company ${companyId}: ${error}`
      );
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/market/companies/all
  router.get("/market/companies/all", async (req, res) => {
    try {
      const { rows } = await db.query(`
      SELECT
        c.id,
        c.name,
        c.short_description,
        c.created_at,
        u.name AS founder_name,
        (
          SELECT balance FROM company_funds WHERE company_id = c.id
        ) AS balance,
        (
          SELECT ARRAY_AGG(url ORDER BY position)
          FROM company_images
          WHERE company_id = c.id AND type = 'logo'
          LIMIT 1
        ) AS image_urls
      FROM companies c
      JOIN users u ON u.uuid = c.founder_uuid
    `);

      res.json({ companies: rows });
    } catch (error) {
      logger.error(`❌ Failed to fetch all companies: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/market/requests
  router.get("/market/requests", async (req, res) => {
    const discordId = req.cookies.user_session;

    if (!discordId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { rows: pendingCompanies } = await db.query(
        `SELECT id, name, status, created_at, fee_required
       FROM pending_companies
       WHERE founder_uuid = $1
       ORDER BY created_at DESC`,
        [user.uuid]
      );

      const { rows: rejectedCompanies } = await db.query(
        `SELECT id, name, reason, rejected_at
       FROM rejected_companies
       WHERE founder_uuid = $1
       ORDER BY rejected_at DESC`,
        [user.uuid]
      );

      res.json({
        pending_companies: pendingCompanies,
        rejected_companies: rejectedCompanies,
      });
    } catch (error) {
      logger.error(`❌ Failed to fetch user requests: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/market/rejected-companies/:id
  router.delete("/market/rejected-companies/:id", async (req, res) => {
    const discordId = req.cookies.user_session;
    const companyId = parseInt(req.params.id, 10);

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(companyId)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      const { rowCount } = await db.query(
        `DELETE FROM rejected_companies
       WHERE id = $1 AND founder_uuid = $2`,
        [companyId, user.uuid]
      );

      if (rowCount === 0) {
        return res
          .status(404)
          .json({ error: "Rejected request not found or not yours." });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error(`❌ Failed to delete rejected company: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/market/pending-companies
  router.get("/market/pending-companies", async (req, res) => {
    try {
      const { rows } = await db.query(
        `SELECT
        pc.id,
        pc.name,
        pc.description,
        pc.status,
        pc.created_at,
        pc.founder_uuid,
        u.name AS owner_name,
        pc.logo_url
      FROM pending_companies pc
      JOIN users u ON pc.founder_uuid = u.uuid
      ORDER BY pc.created_at ASC`
      );

      res.json(rows);
    } catch (error) {
      logger.error(`❌ Failed to fetch pending companies: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/market/pending-companies/:id/pay
  router.post("/market/pending-companies/:id/pay", async (req, res) => {
    const discordId = req.cookies.user_session;
    const id = parseInt(req.params.id, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );
      if (!user) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const {
        rows: [pending],
      } = await client.query(
        `SELECT * FROM pending_companies
       WHERE id = $1 AND founder_uuid = $2 AND status = 'awaiting_funds'
       FOR UPDATE`,
        [id, user.uuid]
      );
      if (!pending) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ error: "Awaiting funds request not found" });
      }

      const fee = Number(pending.fee_required ?? 0);

      const {
        rows: [funds],
      } = await client.query(
        `SELECT balance FROM user_funds WHERE uuid = $1 FOR UPDATE`,
        [user.uuid]
      );
      const balance = Number(funds?.balance ?? 0);
      if (balance < fee) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Insufficient funds",
          code: "AWAITING_FUNDS",
          required: fee,
          balance,
        });
      }

      const {
        rows: [exists],
      } = await client.query(`SELECT 1 FROM companies WHERE id = $1 LIMIT 1`, [
        pending.id,
      ]);
      if (exists) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Company already finalized" });
      }

      await client.query(
        `UPDATE user_funds SET balance = balance - $1 WHERE uuid = $2`,
        [fee, user.uuid]
      );

      await client.query(
        `UPDATE pending_companies
         SET status = 'approved',
             reviewed_at = COALESCE(reviewed_at, NOW()),
             fee_required = NULL,
             fee_checked_at = NULL
       WHERE id = $1`,
        [id]
      );

      try {
        await client.query(
          `INSERT INTO companies (id, founder_uuid, name, description, short_description, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            pending.id,
            pending.founder_uuid,
            pending.name,
            pending.description,
            pending.short_description,
            pending.created_at,
          ]
        );
      } catch (error) {
        if (error?.code === "23505") {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "Company already finalized" });
        }
        throw error;
      }

      await client.query(
        `INSERT INTO company_funds (company_id, balance) VALUES ($1, 0)`,
        [pending.id]
      );
      await client.query(
        `INSERT INTO company_members (user_uuid, company_id, role) VALUES ($1,$2,'Founder')`,
        [pending.founder_uuid, pending.id]
      );

      const imageInserts = [];
      if (pending.logo_url)
        imageInserts.push(
          client.query(
            `INSERT INTO company_images (company_id, url, type, position)
           VALUES ($1,$2,'logo',0)`,
            [pending.id, pending.logo_url]
          )
        );
      if (pending.banner_url)
        imageInserts.push(
          client.query(
            `INSERT INTO company_images (company_id, url, type, position)
           VALUES ($1,$2,'banner',0)`,
            [pending.id, pending.banner_url]
          )
        );
      (pending.gallery_urls ?? []).forEach((u, i) => {
        if (u)
          imageInserts.push(
            client.query(
              `INSERT INTO company_images (company_id, url, type, position)
             VALUES ($1,$2,'gallery',$3)`,
              [pending.id, u, i]
            )
          );
      });
      await Promise.all(imageInserts);

      await client.query("COMMIT");
      return res.json({ success: true, company_id: pending.id });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`❌ Pay & finalize error: ${error}`);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // POST /api/market/company/:id/edits
  router.post(
    "/market/company/:id/edits",
    upload.fields([
      { name: "logo", maxCount: 1 },
      { name: "banner", maxCount: 1 },
      { name: "gallery_0" },
      { name: "gallery_1" },
      { name: "gallery_2" },
      { name: "gallery_3" },
      { name: "gallery_4" },
    ]),
    async (req, res) => {
      const discordId = req.cookies.user_session;
      const companyId = parseInt(req.params.id, 10);
      if (!discordId) return res.status(403).json({ error: "Unauthorized" });
      if (isNaN(companyId))
        return res.status(400).json({ error: "Invalid ID" });

      try {
        const {
          rows: [user],
        } = await db.query(
          `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
          [discordId]
        );
        if (!user) return res.status(404).json({ error: "User not found" });

        const founderCheck = await db.query(
          `SELECT 1 FROM company_members
         WHERE user_uuid = $1 AND company_id = $2 AND role = 'Founder' LIMIT 1`,
          [user.uuid, companyId]
        );
        if (founderCheck.rowCount === 0) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        const existingEdit = await db.query(
          `SELECT id FROM company_edits WHERE company_id = $1 LIMIT 1`,
          [companyId]
        );
        if (existingEdit.rowCount > 0) {
          return res.status(400).json({
            error:
              "An edit already exists for this company. Please wait for admins to review it.",
          });
        }

        const name = (req.body.name ?? "").trim();
        const short_description = (req.body.short_description ?? "").trim();
        const description = req.body.description ?? null;

        const files = req.files || {};
        const logo = files["logo"]?.[0] || null;
        const banner = files["banner"]?.[0] || null;

        let logo_path = null;
        let banner_path = null;
        const gallery_paths = [];
        let galleryPathsSaved = null;

        Object.keys(files)
          .filter((k) => k.startsWith("gallery_"))
          .sort((a, b) => {
            const ai = parseInt(a.split("_")[1] || "0", 10);
            const bi = parseInt(b.split("_")[1] || "0", 10);
            return ai - bi;
          })
          .forEach((key) => {
            const f = files[key][0];
            if (f?.buffer) gallery_paths.push(f);
          });

        const base =
          process.env.LOCAL_ASSETS_DIR ||
          path.resolve(process.cwd(), "uploads");
        const companySubdir = path.join("edits", String(companyId));

        if (logo) {
          const ext = path.extname(logo.originalname) || ".png";
          const saved = await saveLocalImage(
            logo.buffer,
            base,
            companySubdir,
            `logo${ext}`
          );
          logo_path = `/uploads/${saved.relative}`;
        }

        if (banner) {
          const ext = path.extname(banner.originalname) || ".png";
          const saved = await saveLocalImage(
            banner.buffer,
            base,
            companySubdir,
            `banner${ext}`
          );
          banner_path = `/uploads/${saved.relative}`;
        }

        if (gallery_paths.length) {
          galleryPathsSaved = [];
          for (let i = 0; i < gallery_paths.length; i++) {
            const gf = gallery_paths[i];
            const ext = path.extname(gf.originalname) || ".png";
            const saved = await saveLocalImage(
              gf.buffer,
              base,
              path.join(companySubdir, "gallery"),
              `gallery-${i}${ext}`
            );
            galleryPathsSaved.push(`/uploads/${saved.relative}`);
          }
        }

        const {
          rows: [editRow],
        } = await db.query(
          `INSERT INTO company_edits
           (company_id, editor_uuid, name, description, short_description, logo_path, banner_path, gallery_paths)
         VALUES
           ($1, $2, NULLIF($3,''), $4, NULLIF($5,''), $6, $7, $8)
         RETURNING id`,
          [
            companyId,
            user.uuid,
            name,
            description,
            short_description,
            logo_path,
            banner_path,
            galleryPathsSaved?.length ? galleryPathsSaved : null,
          ]
        );

        return res.status(201).json({ success: true, edit_id: editRow.id });
      } catch (error) {
        logger.error(
          `❌ Failed to create company edit for ${companyId}: ${error}`
        );
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // GET /api/market/company-edits
  router.get("/market/company-edits", async (req, res) => {
    const discordId = req.cookies.user_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );
      if (!user) return res.status(404).json({ error: "User not found" });

      const { rows: edits } = await db.query(
        `SELECT e.id, e.company_id, c.name, e.status, e.created_at
          FROM company_edits e
          JOIN companies c ON e.company_id = c.id
          WHERE e.editor_uuid = $1
          ORDER BY e.created_at DESC`,
        [user.uuid]
      );

      const editsWithType = edits.map((e) => ({
        ...e,
        type: "edit",
      }));

      return res.json({
        pending_edits: editsWithType.filter((e) => e.status === "pending"),
        awaiting_funds_edits: editsWithType.filter(
          (e) => e.status === "awaiting_funds"
        ),
        rejected_edits: editsWithType.filter((e) => e.status === "rejected"),
        approved_edits: editsWithType.filter((e) => e.status === "approved"),
      });
    } catch (error) {
      logger.error(`❌ Failed to fetch company edits: ${error}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
