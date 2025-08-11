import logger from "../../logger.js";
import express from "express";
import path from "path";
import upload from "../middleware/multer.js";
import { uploadImageToR2 } from "../utils/market/uploadImageToR2.js";
import { generateUniqueShopId } from "../utils/market/resources/generateUniqueShopId.js";
import {
  notifyAdminPendingShop,
  notifyAdminShopEdit,
} from "../utils/admin/notifyAdminCompanyApprovals.js";
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
    [userUuid, shop.company_id]
  );
  return ok.rowCount > 0;
}

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

  // GET --- /api/market/shop/:shopId ---
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

  // POST --- /api/market/shop/:shopId/edits ---
  router.post(
    "/market/shop/:shopId/edits",
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
      const shopId = parseInt(req.params.shopId, 10);
      if (!discordId) return res.status(403).json({ error: "Unauthorized" });
      if (isNaN(shopId))
        return res.status(400).json({ error: "Invalid shop ID" });

      try {
        const {
          rows: [user],
        } = await db.query(
          `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
          [discordId]
        );
        if (!user) return res.status(404).json({ error: "User not found" });

        const {
          rows: [shop],
        } = await db.query(
          `SELECT s.id, s.company_id, s.name AS current_name
           FROM shops s
          WHERE s.id = $1
          LIMIT 1`,
          [shopId]
        );
        if (!shop) return res.status(404).json({ error: "Shop not found" });

        const founderCheck = await db.query(
          `SELECT 1
           FROM company_members
          WHERE user_uuid = $1
            AND company_id = $2
            AND role = 'Founder'
          LIMIT 1`,
          [user.uuid, shop.company_id]
        );
        if (founderCheck.rowCount === 0) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        const { rowCount: existing } = await db.query(
          `SELECT 1
           FROM shop_edits
          WHERE shop_id = $1
            AND status IN ('pending','awaiting_funds')
          LIMIT 1`,
          [shopId]
        );
        if (existing) {
          return res.status(400).json({
            error:
              "An edit already exists for this shop. Please wait for admins to review it.",
          });
        }

        const name = (req.body.name ?? "").trim();
        const short_description = (req.body.short_description ?? "").trim();
        const description = req.body.description ?? null;

        if (name && name.length > 255) {
          return res.status(400).json({ error: "Invalid shop name length." });
        }
        if (short_description && short_description.length > 128) {
          return res.status(400).json({ error: "Short description too long." });
        }

        if (name) {
          const { rowCount: nameTaken } = await db.query(
            `SELECT 1 FROM shops
            WHERE company_id = $1
              AND id <> $2
              AND LOWER(name) = LOWER($3)
            LIMIT 1`,
            [shop.company_id, shopId, name]
          );
          if (nameTaken) {
            return res.status(409).json({
              error:
                "Another shop with this name already exists in this company.",
            });
          }
        }

        const files = req.files || {};
        const logo = files["logo"]?.[0] || null;
        const banner = files["banner"]?.[0] || null;

        const galleryFiles = Object.keys(files)
          .filter((k) => k.startsWith("gallery_"))
          .sort(
            (a, b) =>
              parseInt(a.split("_")[1] || "0", 10) -
              parseInt(b.split("_")[1] || "0", 10)
          )
          .map((k) => files[k][0]);

        if (galleryFiles.length > 5) {
          return res.status(400).json({ error: "Too many gallery images." });
        }

        const basePath = `shop-edits/${shopId}`;
        let logo_path = null;
        let banner_path = null;
        let gallery_paths = null;

        if (logo) {
          const ext = path.extname(logo.originalname) || ".png";
          logo_path = await uploadImageToR2(logo, basePath, `logo${ext}`);
        }
        if (banner) {
          const ext = path.extname(banner.originalname) || ".png";
          banner_path = await uploadImageToR2(banner, basePath, `banner${ext}`);
        }
        if (galleryFiles.length) {
          const galleryBase = `${basePath}/gallery`;
          gallery_paths = await Promise.all(
            galleryFiles.map((gf, i) => {
              const ext = path.extname(gf.originalname) || ".png";
              return uploadImageToR2(gf, galleryBase, `gallery-${i}${ext}`);
            })
          );
        }

        const {
          rows: [editRow],
        } = await db.query(
          `INSERT INTO shop_edits
          (shop_id, editor_uuid, name, description, short_description, logo_path, banner_path, gallery_paths)
         VALUES
          ($1, $2, NULLIF($3,''), $4, NULLIF($5,''), $6, $7, $8)
         RETURNING id`,
          [
            shopId,
            user.uuid,
            name,
            description,
            short_description,
            logo_path,
            banner_path,
            gallery_paths?.length ? gallery_paths : null,
          ]
        );

        runOnlyInProduction(async () => {
          try {
            await notifyAdminShopEdit(
              {
                edit_id: editRow.id,
                shop_id: shopId,
                company_id: shop.company_id,
                editor_uuid: user.uuid,
                name: name || undefined,
                short_description: short_description || undefined,
              },
              clientBot
            );
          } catch (e) {
            logger.error(
              `❌ Failed to notify admins about shop edit ${shopId}: ${e}`
            );
          }
        });

        return res.status(201).json({ success: true, edit_id: editRow.id });
      } catch (error) {
        logger.error(`❌ Failed to create shop edit for ${shopId}: ${error}`);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // GET --- /api/market/shop-edits ---
  router.get("/market/shop-edits", async (req, res) => {
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

      const { rows: openEdits } = await db.query(
        `SELECT e.id, e.shop_id, s.name, e.status, e.created_at, e.fee_required
         FROM shop_edits e
         JOIN shops s ON s.id = e.shop_id
        WHERE e.editor_uuid = $1
          AND e.status IN ('pending','awaiting_funds')
        ORDER BY e.created_at DESC`,
        [user.uuid]
      );

      const { rows: rejectedEdits } = await db.query(
        `SELECT e.id, e.shop_id, s.name, 'rejected'::text AS status,
              r.reason, r.rejected_at AS created_at
         FROM shop_edits e
         JOIN shops s ON s.id = e.shop_id
         JOIN rejected_shop_edits r ON r.id = e.id
        WHERE e.editor_uuid = $1
          AND e.status = 'rejected'
        ORDER BY r.rejected_at DESC`,
        [user.uuid]
      );

      const { rows: approvedEdits } = await db.query(
        `SELECT e.id, e.shop_id, s.name, e.status, e.created_at
         FROM shop_edits e
         JOIN shops s ON s.id = e.shop_id
        WHERE e.editor_uuid = $1
          AND e.status = 'approved'
        ORDER BY e.created_at DESC`,
        [user.uuid]
      );

      const tag = (rows) => rows.map((r) => ({ ...r, type: "edit" }));
      res.json({
        pending_edits: tag(openEdits.filter((r) => r.status === "pending")),
        awaiting_funds_edits: tag(
          openEdits.filter((r) => r.status === "awaiting_funds")
        ),
        rejected_edits: tag(rejectedEdits),
        approved_edits: tag(approvedEdits),
      });
    } catch (error) {
      logger.error(`❌ /market/shop-edits error: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE --- /api/market/rejected-shop-edits/:id ---
  router.delete("/market/rejected-shop-edits/:id", async (req, res) => {
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

      const { rows, rowCount } = await db.query(
        `SELECT editor_uuid FROM shop_edits WHERE id=$1 LIMIT 1`,
        [id]
      );
      if (!rowCount || rows[0].editor_uuid !== user.uuid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await db.query(`DELETE FROM rejected_shop_edits WHERE id=$1`, [id]);
      return res.json({ success: true });
    } catch (e) {
      logger.error(`❌ delete rejected shop edit ${id}: ${e}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET --- /api/market/shop/:shopId/items ---
  router.get("/market/shop/:shopId/items", async (req, res) => {
    const shopId = parseInt(req.params.shopId, 10);
    if (isNaN(shopId))
      return res.status(400).json({ error: "Invalid shop ID" });

    try {
      const { rows } = await db.query(
        `
      SELECT i.id, i.shop_id, i.name, i.description, i.price, i.stock, i.status,
             i.sku, i.is_featured, i.created_at, i.updated_at,
             COALESCE(ARRAY_AGG(icm.category_id ORDER BY icm.category_id) FILTER (WHERE icm.category_id IS NOT NULL), '{}') AS category_ids
      FROM items i
      LEFT JOIN item_category_map icm ON icm.item_id = i.id
      WHERE i.shop_id = $1
        AND i.status IN ('active','hidden')
      GROUP BY i.id
      ORDER BY i.is_featured DESC, i.created_at DESC
      `,
        [shopId]
      );
      res.json({ items: rows });
    } catch (e) {
      logger.error(`❌ list items for shop ${shopId}: ${e}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST --- /api/market/shop/:shopId/items ---
  router.post("/market/shop/:shopId/items", async (req, res) => {
    const discordId = req.cookies.user_session;
    const shopId = parseInt(req.params.shopId, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(shopId))
      return res.status(400).json({ error: "Invalid shop ID" });

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`,
        [discordId]
      );
      if (!user) throw new Error("User not found");

      const {
        rows: [shop],
      } = await client.query(
        `SELECT id, company_id FROM shops WHERE id=$1 LIMIT 1`,
        [shopId]
      );
      if (!shop) throw new Error("Shop not found");

      const founderOk = await client.query(
        `SELECT 1 FROM company_members WHERE user_uuid=$1 AND company_id=$2 AND role='Founder' LIMIT 1`,
        [user.uuid, shop.company_id]
      );
      if (founderOk.rowCount === 0)
        return res.status(403).json({ error: "Insufficient permissions" });

      const { name, description, price, stock, sku, category_ids } = req.body;

      if (!name || !String(name).trim())
        return res.status(400).json({ error: "Name is required" });
      const p = Number(price ?? 0),
        s = Number(stock ?? 0);
      if (p < 0 || s < 0)
        return res.status(400).json({ error: "Invalid price/stock" });

      const {
        rows: [item],
      } = await client.query(
        `INSERT INTO items (shop_id, name, description, price, stock, sku, status)
       VALUES ($1,$2,$3,$4,$5,$6,'active')
       RETURNING id, shop_id, name, description, price, stock, status, sku, is_featured, created_at, updated_at`,
        [
          shopId,
          String(name).trim().slice(0, 120),
          description?.trim() ?? null,
          p,
          s,
          sku?.trim() ?? null,
        ]
      );

      let cats = Array.isArray(category_ids)
        ? category_ids.map(Number).filter(Number.isFinite)
        : [];

      if (cats.length) {
        const { rows } = await client.query(
          `SELECT id
       FROM item_categories
      WHERE id = ANY($1) AND (shop_id IS NULL OR shop_id = $2)`,
          [cats, shopId]
        );
        const valid = new Set(rows.map((r) => r.id));
        cats = cats.filter((id) => valid.has(id));

        if (cats.length) {
          const values = cats.map((cid, idx) => `($1, $${idx + 2})`).join(",");
          await client.query(
            `INSERT INTO item_category_map (item_id, category_id)
       VALUES ${values} ON CONFLICT DO NOTHING`,
            [item.id, ...cats]
          );
        }
      }

      const {
        rows: [full],
      } = await client.query(
        `SELECT i.*, COALESCE(ARRAY_AGG(icm.category_id ORDER BY icm.category_id) FILTER (WHERE icm.category_id IS NOT NULL), '{}') AS category_ids
       FROM items i LEFT JOIN item_category_map icm ON icm.item_id = i.id
       WHERE i.id=$1 GROUP BY i.id`,
        [item.id]
      );

      await client.query("COMMIT");
      res.status(201).json({ item: full });
    } catch (e) {
      await client.query("ROLLBACK");
      logger.error(`❌ create item shop ${shopId}: ${e}`);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // PATCH --- /api/market/shop/:shopId/items/:itemId ---
  router.patch("/market/shop/:shopId/items/:itemId", async (req, res) => {
    const discordId = req.cookies.user_session;
    const shopId = parseInt(req.params.shopId, 10);
    const itemId = parseInt(req.params.itemId, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if ([shopId, itemId].some(isNaN))
      return res.status(400).json({ error: "Invalid ID" });

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`,
        [discordId]
      );
      if (!user) throw new Error("User not found");

      const {
        rows: [shop],
      } = await client.query(
        `SELECT id, company_id FROM shops WHERE id=$1 LIMIT 1`,
        [shopId]
      );
      if (!shop) throw new Error("Shop not found");

      const founderOk = await client.query(
        `SELECT 1 FROM company_members WHERE user_uuid=$1 AND company_id=$2 AND role='Founder' LIMIT 1`,
        [user.uuid, shop.company_id]
      );
      if (founderOk.rowCount === 0)
        return res.status(403).json({ error: "Insufficient permissions" });

      const {
        name,
        description,
        price,
        stock,
        status,
        sku,
        is_featured,
        category_ids,
      } = req.body;

      const fields = [];
      const values = [];
      let i = 1;
      const add = (c, v) => {
        fields.push(`${c}=$${i++}`);
        values.push(v);
      };

      if (typeof name !== "undefined")
        add("name", String(name).trim().slice(0, 120));
      if (typeof description !== "undefined")
        add("description", description?.trim() ?? null);
      if (typeof price !== "undefined") {
        const p = Number(price);
        if (p < 0) return res.status(400).json({ error: "Invalid price" });
        add("price", p);
      }
      if (typeof stock !== "undefined") {
        const s = Number(stock);
        if (s < 0) return res.status(400).json({ error: "Invalid stock" });
        add("stock", s);
      }
      if (typeof sku !== "undefined") add("sku", sku?.trim() ?? null);
      if (typeof is_featured !== "undefined") add("is_featured", !!is_featured);
      if (typeof status !== "undefined") {
        if (!["active", "hidden"].includes(status))
          return res.status(400).json({ error: "Invalid status" });
        add("status", status);
      }
      add("updated_at", new Date().toISOString());

      if (fields.length) {
        values.push(itemId, shopId);
        await client.query(
          `UPDATE items SET ${fields.join(
            ", "
          )} WHERE id=$${i++} AND shop_id=$${i++}`,
          values
        );
      }

      if (Array.isArray(category_ids)) {
        await client.query(`DELETE FROM item_category_map WHERE item_id=$1`, [
          itemId,
        ]);

        let cats = category_ids.map(Number).filter(Number.isFinite);
        if (cats.length) {
          const { rows } = await client.query(
            `SELECT id
         FROM item_categories
        WHERE id = ANY($1) AND (shop_id IS NULL OR shop_id = $2)`,
            [cats, shopId]
          );
          const valid = new Set(rows.map((r) => r.id));
          cats = cats.filter((id) => valid.has(id));

          if (cats.length) {
            const valuesStr = cats
              .map((_, idx) => `($1, $${idx + 2})`)
              .join(",");
            await client.query(
              `INSERT INTO item_category_map (item_id, category_id)
         VALUES ${valuesStr} ON CONFLICT DO NOTHING`,
              [itemId, ...cats]
            );
          }
        }
      }

      const {
        rows: [full],
      } = await client.query(
        `SELECT i.*, COALESCE(ARRAY_AGG(icm.category_id ORDER BY icm.category_id) FILTER (WHERE icm.category_id IS NOT NULL), '{}') AS category_ids
       FROM items i LEFT JOIN item_category_map icm ON icm.item_id = i.id
       WHERE i.id=$1 AND i.shop_id=$2
       GROUP BY i.id`,
        [itemId, shopId]
      );
      if (!full) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Item not found" });
      }

      await client.query("COMMIT");
      res.json({ item: full });
    } catch (e) {
      await client.query("ROLLBACK");
      logger.error(`❌ update item ${itemId} for shop ${shopId}: ${e}`);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // DELETE --- /api/market/shop/:shopId/items/:itemId ---
  router.delete("/market/shop/:shopId/items/:itemId", async (req, res) => {
    const discordId = req.cookies.user_session;
    const shopId = parseInt(req.params.shopId, 10);
    const itemId = parseInt(req.params.itemId, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if ([shopId, itemId].some(isNaN))
      return res.status(400).json({ error: "Invalid ID" });

    try {
      const {
        rows: [user],
      } = await db.query(`SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`, [
        discordId,
      ]);
      if (!user) return res.status(404).json({ error: "User not found" });

      const {
        rows: [shop],
      } = await db.query(
        `SELECT id, company_id FROM shops WHERE id=$1 LIMIT 1`,
        [shopId]
      );
      if (!shop) return res.status(404).json({ error: "Shop not found" });

      const founderOk = await db.query(
        `SELECT 1 FROM company_members WHERE user_uuid=$1 AND company_id=$2 AND role='Founder' LIMIT 1`,
        [user.uuid, shop.company_id]
      );
      if (founderOk.rowCount === 0)
        return res.status(403).json({ error: "Insufficient permissions" });

      const { rowCount } = await db.query(
        `DELETE FROM items WHERE id=$1 AND shop_id=$2`,
        [itemId, shopId]
      );
      if (!rowCount) return res.status(404).json({ error: "Item not found" });
      return res.json({ success: true });
    } catch (e) {
      logger.error(`❌ delete item ${itemId} for shop ${shopId}: ${e}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET --- /api/market/shop/:shopId/owners ---
  router.get("/market/shop/:shopId/owners", async (req, res) => {
    const shopId = parseInt(req.params.shopId, 10);
    if (isNaN(shopId))
      return res.status(400).json({ error: "Invalid shop ID" });

    try {
      const {
        rows: [row],
      } = await db.query(
        `
      SELECT
        s.company_id,
        c.name AS company_name,
        (
          SELECT url
          FROM company_images
          WHERE company_id = c.id AND type = 'logo'
          ORDER BY position, id
          LIMIT 1
        ) AS company_logo
      FROM shops s
      JOIN companies c ON c.id = s.company_id
      WHERE s.id = $1
      LIMIT 1
      `,
        [shopId]
      );

      if (!row) return res.status(404).json({ error: "Shop not found" });

      const { rows: founders } = await db.query(
        `
      SELECT u.uuid, u.name
      FROM company_members cm
      JOIN users u ON u.uuid = cm.user_uuid
      WHERE cm.company_id = $1 AND cm.role = 'Founder'
      ORDER BY u.name ASC
      `,
        [row.company_id]
      );

      const avatarFor = (uuid, size = 64) =>
        `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;

      res.json({
        company: {
          id: row.company_id,
          name: row.company_name,
          logo_url: row.company_logo,
        },
        founders: founders.map((f) => ({
          uuid: f.uuid,
          name: f.name,
          avatar_url: avatarFor(f.uuid),
        })),
      });
    } catch (e) {
      logger.error(`❌ /market/shop/:shopId/owners: ${e}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET --- /api/market/shop/:shopId/location ---
  router.get("/market/shop/:shopId/location", async (req, res) => {
    const shopId = Number(req.params.shopId);
    if (!Number.isFinite(shopId))
      return res.status(400).json({ error: "Invalid shop ID" });
    try {
      const {
        rows: [loc],
      } = await db.query(
        `SELECT shop_id, dimension, x, z, y, tempad, updated_at
       FROM shop_locations 
       WHERE shop_id=$1`,
        [shopId]
      );
      res.json({ location: loc || null });
    } catch (e) {
      logger.error(`❌ get shop location ${shopId}: ${e}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT --- /api/market/shop/:shopId/location ---
  router.put("/market/shop/:shopId/location", async (req, res) => {
    const discordId = req.cookies.user_session;
    const shopId = Number(req.params.shopId);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (!Number.isFinite(shopId))
      return res.status(400).json({ error: "Invalid shop ID" });

    try {
      const {
        rows: [user],
      } = await db.query("SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1", [
        discordId,
      ]);
      if (!user) return res.status(404).json({ error: "User not found" });

      const {
        rows: [shop],
      } = await db.query(
        "SELECT id, company_id FROM shops WHERE id=$1 LIMIT 1",
        [shopId]
      );
      if (!shop) return res.status(404).json({ error: "Shop not found" });

      const founder = await db.query(
        "SELECT 1 FROM company_members WHERE user_uuid=$1 AND company_id=$2 AND role='Founder' LIMIT 1",
        [user.uuid, shop.company_id]
      );
      if (!founder.rowCount)
        return res.status(403).json({ error: "Insufficient permissions" });

      const { dimension, x, z, y, tempad } = req.body || {};
      if (!["overworld", "nether", "end"].includes(dimension))
        return res.status(400).json({ error: "Invalid dimension" });
      if (![x, z].every((v) => Number.isFinite(Number(v))))
        return res.status(400).json({ error: "Invalid coordinates" });
      if (tempad != null && typeof tempad !== "string")
        return res.status(400).json({ error: "Invalid tempad" });

      await db.query(
        `INSERT INTO shop_locations (shop_id, dimension, x, z, y, tempad, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (shop_id)
       DO UPDATE SET 
         dimension = EXCLUDED.dimension, 
         x = EXCLUDED.x, 
         z = EXCLUDED.z, 
         y = EXCLUDED.y,
         tempad = EXCLUDED.tempad,
         updated_at = NOW()`,
        [
          shopId,
          dimension,
          Number(x),
          Number(z),
          y == null ? null : Number(y),
          tempad || null,
        ]
      );
      res.json({ success: true });
    } catch (e) {
      logger.error(`❌ upsert shop location ${shopId}: ${e}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
