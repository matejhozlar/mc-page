import express from "express";
import upload from "../middleware/multer.js";
import logger from "../../logger.js";
import path from "path";
import { uploadImageToR2 } from "../utils/market/uploadImageToR2.js";
import { notifyAdminCompanyEdit } from "../utils/admin/notifyAdminCompanyApprovals.js";
import { EmbedBuilder } from "discord.js";
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import config from "../../config/index.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

async function isFounderOfShop(db, userUuid, shopId) {
  const {
    rows: [shop],
  } = await db.query(`SELECT company_id FROM shops WHERE id=$1 LIMIT 1`, [
    shopId,
  ]);
  if (!shop) return false;
  const ok = await db.query(
    `SELECT 1 FROM company_members
      WHERE user_uuid=$1 AND company_id=$2 AND role='Founder' LIMIT 1`,
    [userUuid, shop.company_id],
  );
  return ok.rowCount > 0;
}

const r2 = new S3Client({
  region: process.env.R2_REGION,
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const { GOLD } = config.uiColors;
const PUBLIC_BASE = "https://market-assets.createrington.com/";
const BUCKET = process.env.R2_BUCKET_NAME;

function keyFromPublicUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  if (!publicUrl.startsWith(PUBLIC_BASE)) return null;
  return publicUrl.slice(PUBLIC_BASE.length);
}

function extFromKey(key) {
  const idx = key.lastIndexOf(".");
  return idx >= 0 ? key.slice(idx).toLowerCase() : ".png";
}

function guessContentType(ext) {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

async function deleteByPrefix(prefix) {
  let ContinuationToken;
  const keys = [];
  do {
    const resp = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken,
      }),
    );
    (resp.Contents || []).forEach((o) => o?.Key && keys.push(o.Key));
    ContinuationToken = resp.IsTruncated
      ? resp.NextContinuationToken
      : undefined;
  } while (ContinuationToken);

  for (let i = 0; i < keys.length; i += 10) {
    const slice = keys.slice(i, i + 10);
    await Promise.all(
      slice.map((Key) =>
        r2
          .send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))
          .catch(() => {}),
      ),
    );
  }
}

async function moveR2Object(srcUrl, destKey) {
  const srcKey = keyFromPublicUrl(srcUrl);
  if (!srcKey) return null;

  const ext = extFromKey(srcKey);
  const contentType = guessContentType(ext);

  await r2.send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${encodeURI(srcKey)}`,
      Key: destKey,
      CacheControl: "public, max-age=60, s-maxage=300, must-revalidate",
      ContentType: contentType,
      MetadataDirective: "REPLACE",
    }),
  );

  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: srcKey,
    }),
  );

  return `${PUBLIC_BASE}${destKey}`;
}

export default function marketRoutes(db, clientBot) {
  const router = express.Router();

  // GET --- /api/market/me ---
  router.get("/market/me", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    if (!discordId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const userResult = await db.query(
        `SELECT uuid, name, discord_id, last_seen
         FROM users
         WHERE discord_id = $1
         LIMIT 1`,
        [discordId],
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userResult.rows[0];

      const fundsResult = await db.query(
        `SELECT balance FROM user_funds WHERE uuid = $1 LIMIT 1`,
        [user.uuid],
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
        [user.uuid],
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
          [companyIds],
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
    } catch (error) {
      logger.error("/market/me error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/market/companies
  router.post("/market/companies", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    const { name, description } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (!name || typeof name !== "string")
      return res.status(400).json({ error: "Invalid name" });

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId],
      );

      const {
        rows: [company],
      } = await db.query(
        `INSERT INTO companies (founder_uuid, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
        [user.uuid, name.trim(), description || ""],
      );

      await db.query(
        `INSERT INTO company_members (user_uuid, company_id, role)
       VALUES ($1, $2, 'Founder')`,
        [user.uuid, company.id],
      );

      await db.query(
        `INSERT INTO company_funds (company_id, balance) VALUES ($1, 0)`,
        [company.id],
      );

      res.status(201).json(company);
    } catch (error) {
      logger.error("Failed to create company:", error);
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
        [companyId],
      );

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      res.json(company);
    } catch (error) {
      logger.error(`Failed to fetch company ${req.params.id}:`, error);
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
        [companyId],
      );

      if (!row) {
        return res.status(404).json({ error: "Balance not found" });
      }

      res.json({ company_id: companyId, balance: parseFloat(row.balance) });
    } catch (error) {
      logger.error(`Failed to fetch balance for company ${companyId}:`, error);
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
        [companyId],
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
        `Failed to fetch balance history for company ${companyId}:`,
        error,
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
        [companyId],
      );

      res.json({
        company_id: companyId,
        members: rows,
      });
    } catch (error) {
      logger.error(`Failed to fetch members for company ${companyId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET --- /api/market/companies/all ---
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
      logger.error("Failed to fetch all companies:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET --- /api/market/shops/all ---
  router.get("/market/shops/all", async (req, res) => {
    try {
      const { rows } = await db.query(`
      SELECT
        s.id,
        s.name,
        s.short_description,
        s.created_at,
        c.name AS company_name,
        c.id   AS company_id,
        (
          SELECT ARRAY_AGG(url ORDER BY position)
          FROM shop_images
          WHERE shop_id = s.id AND type = 'logo'
          LIMIT 1
        ) AS image_urls
      FROM shops s
      JOIN companies c ON c.id = s.company_id
      ORDER BY s.created_at DESC
    `);

      res.json({ shops: rows });
    } catch (error) {
      logger.error("Failed to fetch all shops:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET --- /api/market/requests ---
  router.get("/market/requests", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId],
      );
      if (!user) return res.status(404).json({ error: "User not found" });

      const [
        { rows: pendingCompanies },
        { rows: awaitingCompanies },
        { rows: approvedCompanies },
      ] = await Promise.all([
        db.query(
          `SELECT id, name, status, created_at, fee_required
         FROM pending_companies
         WHERE founder_uuid = $1 AND status = 'pending'
         ORDER BY created_at DESC`,
          [user.uuid],
        ),
        db.query(
          `SELECT id, name, status, created_at, fee_required
         FROM pending_companies
         WHERE founder_uuid = $1 AND status = 'awaiting_funds'
         ORDER BY created_at DESC`,
          [user.uuid],
        ),
        db.query(
          `SELECT id, name, status, created_at
         FROM pending_companies
         WHERE founder_uuid = $1 AND status = 'approved'
         ORDER BY created_at DESC`,
          [user.uuid],
        ),
      ]);

      const { rows: rejectedCompanies } = await db.query(
        `SELECT id, name, reason, rejected_at
       FROM rejected_companies
       WHERE founder_uuid = $1
       ORDER BY rejected_at DESC`,
        [user.uuid],
      );

      const [
        { rows: pendingShops },
        { rows: awaitingShops },
        { rows: approvedShops },
      ] = await Promise.all([
        db.query(
          `SELECT id, name, status, created_at, fee_required
         FROM pending_shops
         WHERE founder_uuid = $1 AND status = 'pending'
         ORDER BY created_at DESC`,
          [user.uuid],
        ),
        db.query(
          `SELECT id, name, status, created_at, fee_required
         FROM pending_shops
         WHERE founder_uuid = $1 AND status = 'awaiting_funds'
         ORDER BY created_at DESC`,
          [user.uuid],
        ),
        db.query(
          `SELECT id, name, status, created_at
         FROM pending_shops
         WHERE founder_uuid = $1 AND status = 'approved'
         ORDER BY created_at DESC`,
          [user.uuid],
        ),
      ]);

      const { rows: rejectedShops } = await db.query(
        `SELECT id, name, reason, rejected_at
       FROM rejected_shops
       WHERE founder_uuid = $1
       ORDER BY rejected_at DESC`,
        [user.uuid],
      );

      res.json({
        pending_companies: pendingCompanies,
        awaiting_funds_companies: awaitingCompanies,
        approved_companies: approvedCompanies,
        rejected_companies: rejectedCompanies,
        pending_shops: pendingShops,
        awaiting_funds_shops: awaitingShops,
        approved_shops: approvedShops,
        rejected_shops: rejectedShops,
      });
    } catch (error) {
      logger.error("Failed to fetch user requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/market/rejected-companies/:id
  router.delete("/market/rejected-companies/:id", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    const companyId = parseInt(req.params.id, 10);

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(companyId)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId],
      );

      const { rowCount } = await db.query(
        `DELETE FROM rejected_companies
       WHERE id = $1 AND founder_uuid = $2`,
        [companyId, user.uuid],
      );

      if (rowCount === 0) {
        return res
          .status(404)
          .json({ error: "Rejected request not found or not yours." });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error("Failed to delete rejected company:", error);
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
      ORDER BY pc.created_at ASC`,
      );

      res.json(rows);
    } catch (error) {
      logger.error("Failed to fetch pending companies:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/market/pending-companies/:id/pay
  router.post("/market/pending-companies/:id/pay", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
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
        [discordId],
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
        [id, user.uuid],
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
        [user.uuid],
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
        [fee, user.uuid],
      );

      await client.query(
        `UPDATE pending_companies
         SET status = 'approved',
             reviewed_at = COALESCE(reviewed_at, NOW()),
             fee_required = NULL,
             fee_checked_at = NULL
       WHERE id = $1`,
        [id],
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
          ],
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
        [pending.id],
      );
      await client.query(
        `INSERT INTO company_balance_history (company_id, balance) VALUES ($1, 0)`,
        [pending.id],
      );
      await client.query(
        `INSERT INTO company_members (user_uuid, company_id, role) VALUES ($1,$2,'Founder')`,
        [pending.founder_uuid, pending.id],
      );

      const imageInserts = [];
      if (pending.logo_url)
        imageInserts.push(
          client.query(
            `INSERT INTO company_images (company_id, url, type, position)
           VALUES ($1,$2,'logo',0)`,
            [pending.id, pending.logo_url],
          ),
        );
      if (pending.banner_url)
        imageInserts.push(
          client.query(
            `INSERT INTO company_images (company_id, url, type, position)
           VALUES ($1,$2,'banner',0)`,
            [pending.id, pending.banner_url],
          ),
        );
      (pending.gallery_urls ?? []).forEach((u, i) => {
        if (u)
          imageInserts.push(
            client.query(
              `INSERT INTO company_images (company_id, url, type, position)
             VALUES ($1,$2,'gallery',$3)`,
              [pending.id, u, i],
            ),
          );
      });
      await Promise.all(imageInserts);

      const {
        rows: [founder],
      } = await client.query(`SELECT name FROM users WHERE uuid = $1 LIMIT 1`, [
        pending.founder_uuid,
      ]);

      await client.query("COMMIT");
      runOnlyInProduction(() => {
        (async () => {
          try {
            const channel = await clientBot.channels.fetch(
              process.env.DISCORD_COMPANIES_CHANNEL_ID,
            );
            if (!channel?.isTextBased?.()) {
              logger.warn("Companies channel is not text-based or not found.");
              return;
            }

            const embed = new EmbedBuilder()
              .setTitle("🆕 New Company Created")
              .setColor(GOLD)
              .addFields(
                {
                  name: "Company",
                  value: `${pending.name} (ID: ${pending.id})`,
                },
                { name: "Founder", value: founder?.name || "Unknown" },
                ...(pending.short_description
                  ? [{ name: "Summary", value: pending.short_description }]
                  : []),
                {
                  name: "Created At",
                  value: new Date(pending.created_at).toISOString(),
                },
              )
              .setTimestamp();

            await channel.send({ embeds: [embed] });
            logger.info(
              `Posted new company to Discord: ${pending.name} (${pending.id})`,
            );
          } catch (error) {
            logger.warn("Failed to post new company embed:", error);
          }
        })();
      });

      return res.json({ success: true, company_id: pending.id });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Pay & finalize error:", error);
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
      const discordId = req.signedCookies?.user_session;
      const companyId = parseInt(req.params.id, 10);
      if (!discordId) return res.status(403).json({ error: "Unauthorized" });
      if (isNaN(companyId))
        return res.status(400).json({ error: "Invalid ID" });

      try {
        const {
          rows: [user],
        } = await db.query(
          `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
          [discordId],
        );
        if (!user) return res.status(404).json({ error: "User not found" });

        const founderCheck = await db.query(
          `SELECT 1 FROM company_members
         WHERE user_uuid = $1 AND company_id = $2 AND role = 'Founder' LIMIT 1`,
          [user.uuid, companyId],
        );
        if (founderCheck.rowCount === 0) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        const existingEdit = await db.query(
          `SELECT id FROM company_edits WHERE company_id = $1 LIMIT 1`,
          [companyId],
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

        const basePath = `company-edits/${companyId}`;

        if (logo) {
          const ext = path.extname(logo.originalname) || ".png";
          logo_path = await uploadImageToR2(logo, basePath, `logo${ext}`);
        }

        if (banner) {
          const ext = path.extname(banner.originalname) || ".png";
          banner_path = await uploadImageToR2(banner, basePath, `banner${ext}`);
        }

        if (gallery_paths.length) {
          const galleryBase = `${basePath}/gallery`;
          galleryPathsSaved = await Promise.all(
            gallery_paths.map((gf, i) => {
              const ext = path.extname(gf.originalname) || ".png";
              return uploadImageToR2(gf, galleryBase, `gallery-${i}${ext}`);
            }),
          );
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
          ],
        );
        runOnlyInProduction(async () => {
          try {
            await notifyAdminCompanyEdit(
              {
                edit_id: editRow.id,
                company_id: companyId,
                editor_uuid: user.uuid,
                name: name || undefined,
                short_description: short_description || undefined,
              },
              clientBot,
            );
          } catch (error) {
            logger.error(
              `Failed to notify admins about company edit ${companyId}:`,
              error,
            );
          }
        });

        return res.status(201).json({ success: true, edit_id: editRow.id });
      } catch (error) {
        logger.error(`Failed to create company edit for ${companyId}:`, error);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // GET /api/market/company-edits
  router.get("/market/company-edits", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId],
      );
      if (!user) return res.status(404).json({ error: "User not found" });

      const { rows: openEdits } = await db.query(
        `SELECT e.id, e.company_id, c.name, e.status, e.created_at, e.fee_required
       FROM company_edits e
       JOIN companies c ON e.company_id = c.id
       WHERE e.editor_uuid = $1
       AND e.status IN ('pending','awaiting_funds')
       ORDER BY e.created_at DESC`,
        [user.uuid],
      );

      const { rows: rejectedEdits } = await db.query(
        `SELECT e.id, e.company_id, c.name, 'rejected'::text AS status,
              r.reason, r.rejected_at AS created_at  -- align with UI
       FROM company_edits e
       JOIN companies c ON e.company_id = c.id
       JOIN rejected_company_edits r ON r.id = e.id
       WHERE e.editor_uuid = $1
       AND e.status = 'rejected'
       ORDER BY r.rejected_at DESC`,
        [user.uuid],
      );

      const { rows: approvedEdits } = await db.query(
        `SELECT e.id, e.company_id, c.name, e.status, e.created_at
       FROM company_edits e
       JOIN companies c ON e.company_id = c.id
       WHERE e.editor_uuid = $1
       AND e.status = 'approved'
       ORDER BY e.created_at DESC`,
        [user.uuid],
      );

      const tag = (rows) => rows.map((r) => ({ ...r, type: "edit" }));

      return res.json({
        pending_edits: tag(openEdits.filter((e) => e.status === "pending")),
        awaiting_funds_edits: tag(
          openEdits.filter((e) => e.status === "awaiting_funds"),
        ),
        rejected_edits: tag(rejectedEdits),
        approved_edits: tag(approvedEdits),
      });
    } catch (error) {
      logger.error("Failed to fetch company edits:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/market/rejected-edits/:id
  router.delete("/market/rejected-edits/:id", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    const editId = parseInt(req.params.id, 10);

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(editId)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId],
      );
      if (!user) return res.status(404).json({ error: "User not found" });

      const { rows: owned } = await db.query(
        `SELECT 1
       FROM company_edits e
       WHERE e.id = $1
         AND e.editor_uuid = $2
         AND e.status = 'rejected'
       LIMIT 1`,
        [editId, user.uuid],
      );
      if (!owned.length) {
        return res
          .status(404)
          .json({ error: "Rejected edit not found or not yours." });
      }

      await db.query(`DELETE FROM rejected_company_edits WHERE id = $1`, [
        editId,
      ]);
      await db.query(`DELETE FROM company_edits WHERE id = $1`, [editId]);

      return res.json({ success: true });
    } catch (error) {
      logger.error(`Failed to delete rejected edit ${editId}:`, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- ROUTE: POST /api/market/company-edits/:id/pay ---
  router.post("/market/company-edits/:id/pay", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
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
        [discordId],
      );
      if (!user) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const {
        rows: [edit],
      } = await client.query(
        `SELECT * FROM company_edits WHERE id=$1 AND status='awaiting_funds' FOR UPDATE`,
        [id],
      );
      if (!edit) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Awaiting funds edit not found" });
      }

      const {
        rows: [founderRow],
      } = await client.query(
        `SELECT 1 FROM company_members WHERE company_id=$1 AND user_uuid=$2 AND role='Founder'`,
        [edit.company_id, user.uuid],
      );
      if (!founderRow) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const fee = Number(edit.fee_required ?? 0) || 100;

      const {
        rows: [funds],
      } = await client.query(
        `SELECT balance FROM company_funds WHERE company_id=$1 FOR UPDATE`,
        [edit.company_id],
      );
      const balance = Number(funds?.balance ?? 0);
      if (balance < fee) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Insufficient company funds",
          required: fee,
          balance,
        });
      }

      await client.query(
        `UPDATE company_funds SET balance = balance - $1 WHERE company_id = $2`,
        [fee, edit.company_id],
      );

      if (edit.name) {
        await client.query(`UPDATE companies SET name=$1 WHERE id=$2`, [
          edit.name,
          edit.company_id,
        ]);
      }
      if (edit.short_description) {
        await client.query(
          `UPDATE companies SET short_description=$1 WHERE id=$2`,
          [edit.short_description, edit.company_id],
        );
      }
      if (edit.description !== null) {
        await client.query(`UPDATE companies SET description=$1 WHERE id=$2`, [
          edit.description,
          edit.company_id,
        ]);
      }

      const assetBase = `company-assets/${edit.company_id}`;

      let newLogoUrl = null;
      let newBannerUrl = null;
      let newGalleryUrls = [];

      if (edit.logo_path) {
        await deleteByPrefix(`${assetBase}/logo`);
        const srcKey = keyFromPublicUrl(edit.logo_path);
        const ext = srcKey ? extFromKey(srcKey) : ".png";
        newLogoUrl = await moveR2Object(
          edit.logo_path,
          `${assetBase}/logo${ext}`,
        );
      }

      if (edit.banner_path) {
        await deleteByPrefix(`${assetBase}/banner`);
        const srcKey = keyFromPublicUrl(edit.banner_path);
        const ext = srcKey ? extFromKey(srcKey) : ".png";
        newBannerUrl = await moveR2Object(
          edit.banner_path,
          `${assetBase}/banner${ext}`,
        );
      }

      if (Array.isArray(edit.gallery_paths) && edit.gallery_paths.length) {
        await client.query(
          `DELETE FROM company_images WHERE company_id=$1 AND type='gallery'`,
          [edit.company_id],
        );

        const moved = [];
        for (let i = 0; i < edit.gallery_paths.length; i++) {
          const u = edit.gallery_paths[i];
          if (!u) continue;

          await deleteByPrefix(`${assetBase}/gallery/gallery-${i}`);

          const srcKey = keyFromPublicUrl(u);
          const ext = srcKey ? extFromKey(srcKey) : ".png";
          const destKey = `${assetBase}/gallery/gallery-${i}${ext}`;
          const movedUrl = await moveR2Object(u, destKey);
          if (movedUrl) moved.push(movedUrl);
        }
        newGalleryUrls = moved;
      }

      const upserts = [];

      if (newLogoUrl) {
        await client.query(
          `DELETE FROM company_images WHERE company_id=$1 AND type='logo'`,
          [edit.company_id],
        );
        upserts.push(
          client.query(
            `INSERT INTO company_images (company_id, url, type, position) VALUES ($1,$2,'logo',0)`,
            [edit.company_id, newLogoUrl],
          ),
        );
      }

      if (newBannerUrl) {
        await client.query(
          `DELETE FROM company_images WHERE company_id=$1 AND type='banner'`,
          [edit.company_id],
        );
        upserts.push(
          client.query(
            `INSERT INTO company_images (company_id, url, type, position) VALUES ($1,$2,'banner',0)`,
            [edit.company_id, newBannerUrl],
          ),
        );
      }

      if (newGalleryUrls.length) {
        newGalleryUrls.forEach((url, i) => {
          upserts.push(
            client.query(
              `INSERT INTO company_images (company_id, url, type, position) VALUES ($1,$2,'gallery',$3)`,
              [edit.company_id, url, i],
            ),
          );
        });
      }

      await Promise.all(upserts);
      await client.query(`DELETE FROM company_edits WHERE id=$1`, [id]);

      await client.query("COMMIT");
      return res.json({ success: true, company_id: edit.company_id });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Pay & apply edit error:", error);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // POST /api/market/company/:id/funds/deposit
  router.post("/market/company/:id/funds/deposit", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    const companyId = parseInt(req.params.id, 10);
    const { amount } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(companyId)) return res.status(400).json({ error: "Invalid ID" });

    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId],
      );
      if (!user) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const { rowCount: isFounder } = await client.query(
        `SELECT 1 FROM company_members
       WHERE company_id=$1 AND user_uuid=$2 AND role='Founder' LIMIT 1`,
        [companyId, user.uuid],
      );
      if (!isFounder) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const {
        rows: [userFunds],
      } = await client.query(
        `SELECT balance FROM user_funds WHERE uuid=$1 FOR UPDATE`,
        [user.uuid],
      );
      const userBal = Number(userFunds?.balance ?? 0);
      if (userBal < amt) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Insufficient personal funds",
          balance: userBal,
          required: amt,
        });
      }

      await client.query(
        `SELECT balance FROM company_funds WHERE company_id=$1 FOR UPDATE`,
        [companyId],
      );

      await client.query(
        `UPDATE user_funds SET balance = balance - $1 WHERE uuid = $2`,
        [amt, user.uuid],
      );

      const {
        rows: [updatedCompany],
      } = await client.query(
        `UPDATE company_funds SET balance = balance + $1 WHERE company_id = $2
       RETURNING balance`,
        [amt, companyId],
      );

      await client.query("COMMIT");
      return res.json({
        success: true,
        company_balance: Number(updatedCompany.balance),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Deposit error:", error);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // POST /api/market/company/:id/funds/withdraw
  router.post("/market/company/:id/funds/withdraw", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    const companyId = parseInt(req.params.id, 10);
    const { amount } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(companyId)) return res.status(400).json({ error: "Invalid ID" });

    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId],
      );
      if (!user) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const { rowCount: isFounder } = await client.query(
        `SELECT 1 FROM company_members
       WHERE company_id=$1 AND user_uuid=$2 AND role='Founder' LIMIT 1`,
        [companyId, user.uuid],
      );
      if (!isFounder) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const {
        rows: [companyFunds],
      } = await client.query(
        `SELECT balance FROM company_funds WHERE company_id=$1 FOR UPDATE`,
        [companyId],
      );
      const companyBal = Number(companyFunds?.balance ?? 0);
      if (companyBal < amt) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Insufficient company funds",
          balance: companyBal,
          required: amt,
        });
      }

      await client.query(
        `SELECT balance FROM user_funds WHERE uuid=$1 FOR UPDATE`,
        [user.uuid],
      );

      const {
        rows: [updatedCompany],
      } = await client.query(
        `UPDATE company_funds SET balance = balance - $1 WHERE company_id = $2
       RETURNING balance`,
        [amt, companyId],
      );
      await client.query(
        `UPDATE user_funds SET balance = balance + $1 WHERE uuid = $2`,
        [amt, user.uuid],
      );

      await client.query(
        `INSERT INTO company_balance_history (company_id, balance, recorded_at)
       VALUES ($1, $2, NOW())`,
        [companyId, updatedCompany.balance],
      );

      await client.query("COMMIT");
      return res.json({
        success: true,
        company_balance: Number(updatedCompany.balance),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Withdraw error:", error);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // GET /api/market/company/:companyId/shops
  router.get("/market/company/:companyId/shops", async (req, res) => {
    const companyId = parseInt(req.params.companyId, 10);
    if (isNaN(companyId))
      return res.status(400).json({ error: "Invalid company ID" });

    try {
      const { rows } = await db.query(
        `
      SELECT
        s.id,
        s.name,
        s.short_description,
        s.created_at,
        s.company_id,
        (SELECT url
           FROM shop_images
          WHERE shop_id = s.id AND type = 'logo'
          ORDER BY position
          LIMIT 1) AS logo_url,
        (SELECT ARRAY_AGG(url ORDER BY position)
           FROM shop_images
          WHERE shop_id = s.id AND type = 'logo'
          LIMIT 1) AS image_urls
      FROM shops s
      WHERE s.company_id = $1
      ORDER BY s.created_at DESC
      `,
        [companyId],
      );

      res.json({ shops: rows });
    } catch (error) {
      logger.error(`Failed to fetch company ${companyId} shops:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST --- /api/market/shop-edits/:id/pay ---
  router.post("/market/shop-edits/:id/pay", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    const id = parseInt(req.params.id, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`,
        [discordId],
      );
      if (!user) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const {
        rows: [edit],
      } = await client.query(
        `SELECT * FROM shop_edits WHERE id=$1 AND status='awaiting_funds' FOR UPDATE`,
        [id],
      );
      if (!edit) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Awaiting funds edit not found" });
      }

      const {
        rows: [shop],
      } = await client.query(
        `SELECT s.id, s.company_id FROM shops s WHERE s.id=$1 LIMIT 1`,
        [edit.shop_id],
      );
      if (!shop) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Shop not found" });
      }

      const { rowCount: founderOk } = await client.query(
        `SELECT 1 FROM company_members
        WHERE user_uuid=$1 AND company_id=$2 AND role='Founder' LIMIT 1`,
        [user.uuid, shop.company_id],
      );
      if (!founderOk) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const fee = Number(edit.fee_required ?? 0) || 20;

      const {
        rows: [funds],
      } = await client.query(
        `SELECT balance FROM company_funds WHERE company_id=$1 FOR UPDATE`,
        [shop.company_id],
      );
      const balance = Number(funds?.balance ?? 0);
      if (balance < fee) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Insufficient company funds",
          required: fee,
          balance,
        });
      }

      await client.query(
        `UPDATE company_funds SET balance = balance - $1 WHERE company_id = $2`,
        [fee, shop.company_id],
      );

      if (edit.name) {
        await client.query(`UPDATE shops SET name=$1 WHERE id=$2`, [
          edit.name,
          edit.shop_id,
        ]);
      }
      if (edit.short_description) {
        await client.query(
          `UPDATE shops SET short_description=$1 WHERE id=$2`,
          [edit.short_description, edit.shop_id],
        );
      }
      if (edit.description !== null) {
        await client.query(`UPDATE shops SET description=$1 WHERE id=$2`, [
          edit.description,
          edit.shop_id,
        ]);
      }

      const assetBase = `shop-assets/${edit.shop_id}`;

      let newLogoUrl = null;
      let newBannerUrl = null;
      let newGalleryUrls = [];

      if (edit.logo_path) {
        await deleteByPrefix(`${assetBase}/logo`);
        const srcKey = keyFromPublicUrl(edit.logo_path);
        const ext = srcKey ? extFromKey(srcKey) : ".png";
        newLogoUrl = await moveR2Object(
          edit.logo_path,
          `${assetBase}/logo${ext}`,
        );
      }

      if (edit.banner_path) {
        await deleteByPrefix(`${assetBase}/banner`);
        const srcKey = keyFromPublicUrl(edit.banner_path);
        const ext = srcKey ? extFromKey(srcKey) : ".png";
        newBannerUrl = await moveR2Object(
          edit.banner_path,
          `${assetBase}/banner${ext}`,
        );
      }

      if (Array.isArray(edit.gallery_paths) && edit.gallery_paths.length) {
        await client.query(
          `DELETE FROM shop_images WHERE shop_id=$1 AND type='gallery'`,
          [edit.shop_id],
        );

        const moved = [];
        for (let i = 0; i < edit.gallery_paths.length; i++) {
          const src = edit.gallery_paths[i];
          if (!src) continue;

          await deleteByPrefix(`${assetBase}/gallery/gallery-${i}`);

          const srcKey = keyFromPublicUrl(src);
          const ext = srcKey ? extFromKey(srcKey) : ".png";
          const destKey = `${assetBase}/gallery/gallery-${i}${ext}`;
          const movedUrl = await moveR2Object(src, destKey);
          if (movedUrl) moved.push(movedUrl);
        }
        newGalleryUrls = moved;
      }

      const upserts = [];

      if (newLogoUrl) {
        await client.query(
          `DELETE FROM shop_images WHERE shop_id=$1 AND type='logo'`,
          [edit.shop_id],
        );
        upserts.push(
          client.query(
            `INSERT INTO shop_images (shop_id, url, type, position) VALUES ($1,$2,'logo',0)`,
            [edit.shop_id, newLogoUrl],
          ),
        );
      }

      if (newBannerUrl) {
        await client.query(
          `DELETE FROM shop_images WHERE shop_id=$1 AND type='banner'`,
          [edit.shop_id],
        );
        upserts.push(
          client.query(
            `INSERT INTO shop_images (shop_id, url, type, position) VALUES ($1,$2,'banner',0)`,
            [edit.shop_id, newBannerUrl],
          ),
        );
      }

      for (let i = 0; i < newGalleryUrls.length; i++) {
        upserts.push(
          client.query(
            `INSERT INTO shop_images (shop_id, url, type, position) VALUES ($1,$2,'gallery',$3)`,
            [edit.shop_id, newGalleryUrls[i], i],
          ),
        );
      }

      await Promise.all(upserts);

      await client.query(
        `UPDATE shop_edits SET status='approved', reviewed_at=NOW() WHERE id=$1`,
        [id],
      );

      await client.query("COMMIT");
      return res.json({ success: true, status: "approved" });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`/market/shop-edits/${id}/pay error:`, error);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // GET --- /api/market/shop/:shopId/categories ---
  router.get("/market/shop/:shopId/categories", async (req, res) => {
    const shopId = parseInt(req.params.shopId, 10);
    if (isNaN(shopId))
      return res.status(400).json({ error: "Invalid shop ID" });
    try {
      const { rows } = await db.query(
        `SELECT id, name, shop_id
         FROM item_categories
        WHERE shop_id IS NULL OR shop_id=$1
        ORDER BY (shop_id IS NULL) DESC, name ASC`,
        [shopId],
      );
      res.json({ categories: rows });
    } catch (error) {
      logger.error(`categories list for shop ${shopId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST --- /api/market/shop/:shopId/categories ---
  router.post("/market/shop/:shopId/categories", async (req, res) => {
    const discordId = req.signedCookies?.user_session;
    const shopId = parseInt(req.params.shopId, 10);
    const { name } = req.body || {};
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(shopId))
      return res.status(400).json({ error: "Invalid shop ID" });
    if (!name || !String(name).trim())
      return res.status(400).json({ error: "Name is required" });

    try {
      const {
        rows: [user],
      } = await db.query(`SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`, [
        discordId,
      ]);
      if (!user) return res.status(404).json({ error: "User not found" });
      const can = await isFounderOfShop(db, user.uuid, shopId);
      if (!can)
        return res.status(403).json({ error: "Insufficient permissions" });

      const {
        rows: [row],
      } = await db.query(
        `INSERT INTO item_categories (shop_id, name)
       VALUES ($1, $2)
       ON CONFLICT (shop_id, lower(name)) DO NOTHING
       RETURNING id, name, shop_id`,
        [shopId, String(name).trim()],
      );
      if (!row)
        return res.status(409).json({ error: "Category already exists" });
      res.status(201).json({ category: row });
    } catch (error) {
      logger.error(`create category shop ${shopId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PATCH --- /api/market/shop/:shopId/categories/:categoryId ---
  router.patch(
    "/market/shop/:shopId/categories/:categoryId",
    async (req, res) => {
      const discordId = req.signedCookies?.user_session;
      const shopId = parseInt(req.params.shopId, 10);
      const categoryId = parseInt(req.params.categoryId, 10);
      const { name } = req.body || {};
      if (!discordId) return res.status(403).json({ error: "Unauthorized" });
      if ([shopId, categoryId].some(isNaN))
        return res.status(400).json({ error: "Invalid ID" });
      if (!name || !String(name).trim())
        return res.status(400).json({ error: "Name is required" });

      try {
        const {
          rows: [user],
        } = await db.query(
          `SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`,
          [discordId],
        );
        if (!user) return res.status(404).json({ error: "User not found" });
        const can = await isFounderOfShop(db, user.uuid, shopId);
        if (!can)
          return res.status(403).json({ error: "Insufficient permissions" });

        const {
          rows: [cat],
        } = await db.query(
          `SELECT id, shop_id FROM item_categories WHERE id=$1 LIMIT 1`,
          [categoryId],
        );
        if (!cat) return res.status(404).json({ error: "Category not found" });
        if (cat.shop_id !== shopId)
          return res.status(403).json({ error: "Cannot modify this category" });

        const {
          rows: [row],
        } = await db.query(
          `UPDATE item_categories SET name=$1 WHERE id=$2
       RETURNING id, name, shop_id`,
          [String(name).trim(), categoryId],
        );
        res.json({ category: row });
      } catch (error) {
        logger.error(`rename category ${categoryId} shop ${shopId}:`, error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // DELETE --- /api/market/shop/:shopId/categories/:categoryId ---
  router.delete(
    "/market/shop/:shopId/categories/:categoryId",
    async (req, res) => {
      const discordId = req.signedCookies?.user_session;
      const shopId = parseInt(req.params.shopId, 10);
      const categoryId = parseInt(req.params.categoryId, 10);
      if (!discordId) return res.status(403).json({ error: "Unauthorized" });
      if ([shopId, categoryId].some(isNaN))
        return res.status(400).json({ error: "Invalid ID" });

      try {
        const {
          rows: [user],
        } = await db.query(
          `SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`,
          [discordId],
        );
        if (!user) return res.status(404).json({ error: "User not found" });
        const can = await isFounderOfShop(db, user.uuid, shopId);
        if (!can)
          return res.status(403).json({ error: "Insufficient permissions" });

        const {
          rows: [cat],
        } = await db.query(
          `SELECT id, shop_id FROM item_categories WHERE id=$1 LIMIT 1`,
          [categoryId],
        );
        if (!cat) return res.status(404).json({ error: "Category not found" });
        if (cat.shop_id !== shopId)
          return res.status(403).json({ error: "Cannot delete this category" });

        const {
          rows: [cnt],
        } = await db.query(
          `SELECT COUNT(*)::int AS n FROM item_category_map WHERE category_id=$1`,
          [categoryId],
        );
        if (cnt.n > 0)
          return res.status(409).json({ error: "Category has items" });

        await db.query(`DELETE FROM item_categories WHERE id=$1`, [categoryId]);
        res.json({ success: true });
      } catch (error) {
        logger.error(`delete category ${categoryId} shop ${shopId}:`, error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  return router;
}
