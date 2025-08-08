import logger from "../../logger.js";
import express from "express";
import path from "path";
import upload from "../middleware/multer.js";
import { uploadImageToR2 } from "../utils/market/uploadImageToR2.js";
import { generateUniqueShopId } from "../utils/market/resources/generateUniqueShopId.js";
import { notifyAdminPendingShop } from "../utils/admin/notifyAdminCompanyApprovals.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

export default function shopSubmissionRoutes(db, clientBot) {
  const router = express.Router();

  async function requireFounder(discordId, companyId) {
    const { rows: u } = await db.query(
      "SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1",
      [discordId]
    );
    const user = u[0];
    if (!user) return { ok: false, code: 404, msg: "User not found" };

    const { rowCount } = await db.query(
      "SELECT 1 FROM company_members WHERE user_uuid=$1 AND company_id=$2 AND role='Founder' LIMIT 1",
      [user.uuid, companyId]
    );
    if (!rowCount)
      return { ok: false, code: 403, msg: "Insufficient permissions" };
    return { ok: true, user };
  }

  // POST --- /api/market/company/:companyId/pending-shops ---
  router.post(
    "/market/company/:companyId/pending-shops",
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
      try {
        const discordId = req.cookies.user_session;
        const companyId = parseInt(req.params.companyId, 10);

        if (!discordId)
          return res
            .status(401)
            .json({ error: "Unauthorized: no session found." });
        if (isNaN(companyId))
          return res.status(400).json({ error: "Invalid company ID." });

        const perm = await requireFounder(discordId, companyId);
        if (!perm.ok) return res.status(perm.code).json({ error: perm.msg });
        const founder_uuid = perm.user.uuid;

        const { rowCount: alreadyPending } = await db.query(
          `SELECT 1
           FROM pending_shops
          WHERE founder_uuid = $1
            AND status = 'pending'
          LIMIT 1`,
          [founder_uuid]
        );
        if (alreadyPending) {
          return res.status(400).json({
            error:
              "You already have a pending shop submission. Please wait for review.",
          });
        }

        const { rows: cap } = await db.query(
          `
        SELECT
          (SELECT COUNT(*) FROM shops s WHERE s.company_id = $1) +
          (SELECT COUNT(*) FROM pending_shops ps
             WHERE ps.company_id = $1
               AND ps.status IN ('pending','awaiting_funds')) AS total
        `,
          [companyId]
        );
        if ((cap[0]?.total ?? 0) >= 5) {
          return res.status(409).json({ error: "Max shops reached (5)" });
        }

        const rawName = (req.body.name || "").trim();
        const short_description = (req.body.short_description || "").trim();
        const description = req.body.description || null;

        if (!rawName || rawName.length > 255) {
          return res.status(400).json({ error: "Invalid shop name." });
        }
        if (short_description && short_description.length > 128) {
          return res.status(400).json({ error: "Short description too long" });
        }

        const { rowCount: takenLive } = await db.query(
          "SELECT 1 FROM shops WHERE company_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1",
          [companyId, rawName]
        );
        const { rowCount: takenPending } = await db.query(
          "SELECT 1 FROM pending_shops WHERE company_id=$1 AND LOWER(name)=LOWER($2) AND status='pending' LIMIT 1",
          [companyId, rawName]
        );
        if (takenLive || takenPending) {
          return res.status(409).json({
            error:
              "A shop with this name already exists or is pending for this company.",
          });
        }

        const customId = await generateUniqueShopId(db);

        await db.query(
          `INSERT INTO pending_shops
           (id, company_id, founder_uuid, name, description, short_description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            customId,
            companyId,
            founder_uuid,
            rawName,
            description,
            short_description || null,
          ]
        );

        const logo = req.files?.["logo"]?.[0];
        const banner = req.files?.["banner"]?.[0];
        const gallery = Object.keys(req.files || {})
          .filter((k) => k.startsWith("gallery_"))
          .sort(
            (a, b) =>
              parseInt(a.split("_")[1] || "0", 10) -
              parseInt(b.split("_")[1] || "0", 10)
          )
          .map((k) => req.files[k][0]);

        const ext = (file) =>
          (path.extname(file.originalname) || "").toLowerCase();

        const base = `shop-assets/${customId}`;
        const logoUrl = logo
          ? await uploadImageToR2(logo, base, `logo${ext(logo) || ".png"}`)
          : null;
        const bannerUrl = banner
          ? await uploadImageToR2(
              banner,
              base,
              `banner${ext(banner) || ".png"}`
            )
          : null;

        if (gallery.length > 5) {
          return res.status(400).json({ error: "Too many gallery images." });
        }

        const galleryUrls = [];
        for (let i = 0; i < gallery.length; i++) {
          const f = gallery[i];
          const url = await uploadImageToR2(
            f,
            `${base}/gallery`,
            `gallery-${i}${ext(f) || ".png"}`
          );
          galleryUrls.push(url);
        }

        await db.query(
          `UPDATE pending_shops
            SET logo_url=$1, banner_url=$2, gallery_urls=$3
          WHERE id=$4`,
          [logoUrl, bannerUrl, galleryUrls, customId]
        );

        runOnlyInProduction(async () => {
          await notifyAdminPendingShop(
            {
              id: customId,
              name: rawName,
              company_id: companyId,
              founder_uuid,
              short_description: short_description || undefined,
            },
            clientBot
          );
        });

        return res.status(201).json({ success: true, shop_id: customId });
      } catch (error) {
        if (error && error.code === "23505") {
          return res.status(409).json({
            error:
              "A pending shop with these details already exists, or you already have a pending submission.",
          });
        }
        logger.error(`❌ Failed to submit shop: ${error}`);
        return res.status(500).json({ error: "Failed to submit shop." });
      }
    }
  );

  // POST --- /api/market/pending-shops/:id/pay ---
  router.post("/market/pending-shops/:id/pay", async (req, res) => {
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
        `SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`,
        [discordId]
      );
      if (!user) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const {
        rows: [pending],
      } = await client.query(
        `SELECT * FROM pending_shops
         WHERE id=$1 AND founder_uuid=$2 AND status='awaiting_funds' FOR UPDATE`,
        [id, user.uuid]
      );
      if (!pending) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ error: "Awaiting funds request not found" });
      }
      const { rowCount: isFounder } = await client.query(
        `SELECT 1 FROM company_members WHERE company_id=$1 AND user_uuid=$2 AND role='Founder'`,
        [pending.company_id, user.uuid]
      );
      if (!isFounder) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const fee = Number(pending.fee_required ?? 0);
      const {
        rows: [uf],
      } = await client.query(
        `SELECT balance FROM user_funds WHERE uuid=$1 FOR UPDATE`,
        [user.uuid]
      );
      const balance = Number(uf?.balance ?? 0);
      if (balance < fee) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ error: "Insufficient funds", required: fee, balance });
      }

      const { rowCount: exists } = await client.query(
        `SELECT 1 FROM shops WHERE id=$1 LIMIT 1`,
        [pending.id]
      );
      if (exists) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Shop already finalized" });
      }

      await client.query(
        `UPDATE user_funds SET balance = balance - $1 WHERE uuid=$2`,
        [fee, user.uuid]
      );

      await client.query(
        `INSERT INTO shops (id, company_id, name, description, short_description, is_paid, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          pending.id,
          pending.company_id,
          pending.name,
          pending.description,
          pending.short_description,
          true,
          pending.created_at,
        ]
      );

      const inserts = [];
      if (pending.logo_url) {
        inserts.push(
          client.query(
            `INSERT INTO shop_images (shop_id, url, type, position) VALUES ($1,$2,'logo',0)`,
            [pending.id, pending.logo_url]
          )
        );
      }
      if (pending.banner_url) {
        inserts.push(
          client.query(
            `INSERT INTO shop_images (shop_id, url, type, position) VALUES ($1,$2,'banner',0)`,
            [pending.id, pending.banner_url]
          )
        );
      }
      (pending.gallery_urls || []).forEach((u, i) => {
        if (!u) return;
        inserts.push(
          client.query(
            `INSERT INTO shop_images (shop_id, url, type, position) VALUES ($1,$2,'gallery',$3)`,
            [pending.id, u, i]
          )
        );
      });
      await Promise.all(inserts);

      await client.query(
        `UPDATE pending_shops
           SET status='approved', reviewed_at=COALESCE(reviewed_at, NOW()),
               fee_required=NULL, fee_checked_at=NULL
         WHERE id=$1`,
        [id]
      );

      await client.query("COMMIT");
      return res.json({ success: true, shop_id: pending.id });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`❌ Pay & finalize shop error: ${error}`);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // GET --- /api/market/pending-shops
  router.get("/market/pending-shops", async (req, res) => {
    try {
      const { rows } = await db.query(
        `SELECT ps.id, ps.company_id, c.name AS company_name, ps.name, ps.status, ps.created_at,
                ps.founder_uuid, u.name AS owner_name, ps.logo_url
           FROM pending_shops ps
           JOIN companies c ON c.id = ps.company_id
           JOIN users u ON ps.founder_uuid = u.uuid
          ORDER BY ps.created_at ASC`
      );
      res.json(rows);
    } catch (error) {
      logger.error(`❌ Failed to fetch pending shops: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE --- /api/market/rejected-shops/:id
  router.delete("/market/rejected-shops/:id", async (req, res) => {
    const discordId = req.cookies.user_session;
    const id = parseInt(req.params.id, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const {
        rows: [user],
      } = await db.query(`SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`, [
        discordId,
      ]);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { rowCount } = await db.query(
        `DELETE FROM rejected_shops WHERE id=$1 AND founder_uuid=$2`,
        [id, user.uuid]
      );
      if (!rowCount) {
        return res
          .status(404)
          .json({ error: "Rejected shop not found or not yours." });
      }
      return res.json({ success: true });
    } catch (error) {
      logger.error(`❌ Failed to delete rejected shop ${id}: ${error}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.use((err, req, res, next) => {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Max size is 10MB." });
    }
    if (err.message === "Only image files are allowed.") {
      return res
        .status(400)
        .json({ error: "Invalid file type. Only images are allowed." });
    }
    logger.error(`❌ Upload middleware error: ${err.message}`);
    return res.status(500).json({ error: "Unexpected server error." });
  });

  // GET /api/market/my-companies?role=Founder
  router.get("/market/my-companies", async (req, res) => {
    const discordId = req.cookies.user_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    const role = (req.query.role || "Founder").trim();

    try {
      const {
        rows: [user],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );
      if (!user) return res.status(404).json({ error: "User not found" });

      const { rows } = await db.query(
        `
      SELECT
        c.id,
        c.name,
        c.short_description,
        c.created_at,
        -- logo
        (
          SELECT url
          FROM company_images
          WHERE company_id = c.id AND type = 'logo'
          ORDER BY position
          LIMIT 1
        ) AS logo_url,
        -- number of shops
        (
          SELECT COUNT(*)::int FROM shops WHERE company_id = c.id
        ) AS shop_count
      FROM companies c
      JOIN company_members cm
        ON cm.company_id = c.id AND cm.user_uuid = $1
      WHERE cm.role = $2
      ORDER BY c.created_at DESC
      `,
        [user.uuid, role]
      );

      res.json({ companies: rows });
    } catch (err) {
      logger.error(`❌ /market/my-companies failed: ${err}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET --- /api/market/shop/:shopId
  router.get("/market/shop/:shopId", async (req, res) => {
    const shopId = parseInt(req.params.shopId, 10);
    if (isNaN(shopId))
      return res.status(400).json({ error: "Invalid shop ID" });

    try {
      const { rows } = await db.query(
        `
      SELECT
        s.id,
        s.company_id,
        c.name AS company_name,
        s.name,
        s.short_description,
        s.description,
        s.created_at,

        -- main logo
        (
          SELECT si.url
          FROM shop_images si
          WHERE si.shop_id = s.id AND si.type = 'logo'
          ORDER BY si.position, si.id
          LIMIT 1
        ) AS logo_url,

        -- banner
        (
          SELECT si.url
          FROM shop_images si
          WHERE si.shop_id = s.id AND si.type = 'banner'
          ORDER BY si.position, si.id
          LIMIT 1
        ) AS banner_url,

        -- gallery array
        COALESCE((
          SELECT ARRAY_AGG(si.url ORDER BY si.position, si.id)
          FROM shop_images si
          WHERE si.shop_id = s.id AND si.type = 'gallery'
        ), '{}') AS gallery_urls
      FROM shops s
      JOIN companies c ON c.id = s.company_id
      WHERE s.id = $1
      LIMIT 1
      `,
        [shopId]
      );

      if (!rows.length) {
        return res.status(404).json({ error: "Shop not found" });
      }

      return res.json(rows[0]);
    } catch (err) {
      logger.error(`❌ Failed to fetch shop ${shopId}: ${err}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
