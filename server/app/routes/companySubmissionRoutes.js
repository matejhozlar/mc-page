import logger from "../../logger.js";
import express from "express";
import path from "path";
import { generateUniqueCompanyId } from "../utils/market/resources/generateUniqueCompanyId.js";
import { uploadImageToR2 } from "../utils/market/uploadImageToR2.js";
import upload from "../middleware/multer.js";

export default function submissionRoutes(db) {
  const router = express.Router();

  // POST --- /api/market/company/pending-companies ---
  router.post(
    "/market/pending-companies",
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
        const { name, description, short_description } = req.body;
        const discord_id = req.cookies.user_session;

        if (!discord_id) {
          return res
            .status(401)
            .json({ error: "Unauthorized: no session found." });
        }

        const userResult = await db.query(
          `SELECT uuid FROM users WHERE discord_id = $1`,
          [discord_id]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: "User not found." });
        }

        const founder_uuid = userResult.rows[0].uuid;

        const existingPending = await db.query(
          `SELECT id FROM pending_companies WHERE founder_uuid = $1 LIMIT 1`,
          [founder_uuid]
        );

        if (existingPending.rowCount > 0) {
          return res.status(400).json({
            error: "You already have a pending company submission.",
          });
        }

        if (!name || name.length > 255) {
          return res.status(400).json({ error: "Invalid company name." });
        }

        const customId = await generateUniqueCompanyId(db);

        await db.query(
          `INSERT INTO pending_companies (
            id, founder_uuid, name, description, short_description
          ) VALUES ($1, $2, $3, $4, $5)`,
          [customId, founder_uuid, name, description, short_description]
        );

        const logo = req.files["logo"]?.[0];
        const banner = req.files["banner"]?.[0];
        const gallery = Object.keys(req.files)
          .filter((k) => k.startsWith("gallery_"))
          .map((k) => req.files[k][0]);

        const ext = (file) => path.extname(file.originalname).toLowerCase();

        const logoUrl = logo
          ? await uploadImageToR2(
              logo,
              `company-assets/${customId}`,
              `logo${ext(logo)}`
            )
          : null;

        const bannerUrl = banner
          ? await uploadImageToR2(
              banner,
              `company-assets/${customId}`,
              `banner${ext(banner)}`
            )
          : null;

        if (gallery.length > 5) {
          return res.status(400).json({ error: "Too many gallery images." });
        }

        const galleryUrls = [];
        for (let i = 0; i < gallery.length; i++) {
          const file = gallery[i];
          const fileName = `gallery-${i}${ext(file)}`;
          const url = await uploadImageToR2(
            file,
            `company-assets/${customId}/gallery`,
            fileName
          );
          galleryUrls.push(url);
        }

        await db.query(
          `UPDATE pending_companies
           SET logo_url = $1, banner_url = $2, gallery_urls = $3
           WHERE id = $4`,
          [logoUrl, bannerUrl, galleryUrls, customId]
        );

        res.status(200).json({ success: true, company_id: customId });
      } catch (error) {
        logger.error(`❌ Failed to submit company: ${error}`);
        res.status(500).json({ error: "Failed to submit company." });
      }
    }
  );

  // Error handler for multer issues
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

  return router;
}
