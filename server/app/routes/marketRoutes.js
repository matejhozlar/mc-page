import express from "express";
import logger from "../../logger.js";

export default function marketRoutes(db) {
  const router = express.Router();

  // --- /api/market/me ---
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

      res.json({
        ...user,
        balance,
        company_count,
        max_companies,
        avatar_url: `https://cdn.discordapp.com/avatars/${discordId}/${discordId}.png`, // optionally smarter
        companies: companiesResult.rows,
      });
    } catch (err) {
      logger.error(`❌ /market/me error: ${err}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
