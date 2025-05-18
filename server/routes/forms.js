// routes/forms.js
import express from "express";
import logger from "../logger.js";
import logError from "../utils/logError.js";
import { notifyAdminWaitlist } from "../utils/emailAdminOnWaitlist.js";

export default function formRoutes(db, client) {
  const router = express.Router();

  // --- /api/apply ---
  router.post("/apply", async (req, res) => {
    const { mcName, dcName, age, howFound, experience, whyJoin } = req.body;

    logger.info(
      `📨 Application received — MC: ${mcName}, DC: ${dcName}, Age: ${age}`
    );

    const insertQuery = `
      INSERT INTO applications (mc_name, dc_name, age, how_found, experience, why_join)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    try {
      const result = await db.query(insertQuery, [
        mcName,
        dcName,
        age,
        howFound || null,
        experience || null,
        whyJoin,
      ]);
      logger.info(`✅ Application inserted for ${mcName} (${dcName})`);
      res.json({ success: true, application: result.rows[0] });
    } catch (error) {
      logger.error(
        `❌ Failed to insert application — MC: ${mcName}, DC: ${dcName}: ${logError(
          error
        )}`
      );
      res.status(500).json({ error: "Error submitting application" });
    }
  });

  // --- /api/wait-list ---
  router.post("/wait-list", async (req, res) => {
    const { email, discordName } = req.body;

    logger.info(`📥 Waitlist submission attempt: ${email} / ${discordName}`);

    if (!email || !discordName) {
      logger.warn(`❌ Missing email or Discord name in waitlist form.`);
      return res.status(400).json({
        error:
          "Email and Discord username are required.\nIf you're having trouble, contact admin@create-rington.com",
      });
    }

    const isValidEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    if (!isValidEmail(email)) {
      logger.warn(`❌ Invalid email format: ${email}`);
      return res.status(400).json({
        error:
          "Invalid email format.\nIf you're having trouble, contact admin@create-rington.com",
      });
    }

    try {
      const emailExists = await db.query(
        `SELECT 1 FROM waitlist_emails WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
      if (emailExists.rowCount > 0) {
        logger.warn(`⚠️ Duplicate email on waitlist: ${email}`);
        return res.status(409).json({
          error:
            "This email is already on the waitlist.\nIf you're having trouble, contact admin@create-rington.com",
        });
      }

      const discordExists = await db.query(
        `SELECT 1 FROM waitlist_emails WHERE LOWER(discord_name) = LOWER($1)`,
        [discordName]
      );
      if (discordExists.rowCount > 0) {
        logger.warn(`⚠️ Duplicate Discord name on waitlist: ${discordName}`);
        return res.status(409).json({
          error:
            "This Discord username is already registered.\nIf you're having trouble, contact admin@create-rington.com",
        });
      }

      const insertQuery = `
        INSERT INTO waitlist_emails (email, discord_name)
        VALUES ($1, $2)
        RETURNING *
      `;
      const result = await db.query(insertQuery, [email, discordName]);
      const entry = result.rows[0];

      logger.info(`✅ Waitlist entry added: ${email} (${discordName})`);
      await notifyAdminWaitlist(entry, client);
      res.json({ success: true, entry: result.rows[0] });
    } catch (error) {
      logger.error(
        `❌ Failed to insert waitlist entry for ${email}: ${logError(error)}`
      );
      res.status(500).json({
        error:
          "Error submitting waitlist entry.\nIf you're having trouble, contact admin@create-rington.com",
      });
    }
  });

  return router;
}
