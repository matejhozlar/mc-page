import express from "express";
import logger from "../../logger.js";
import {
  notifyAdminWaitlist,
  autoInviteAndNotify,
} from "../utils/admin/emailAdminOnWaitlist.js";

export default function formRoutes(db, client) {
  const router = express.Router();

  // --- /api/wait-list ---
  router.post("/wait-list", async (req, res) => {
    const { email, discordName } = req.body;

    logger.info(`Waitlist submission attempt: ${email} / ${discordName}`);

    if (!email || !discordName) {
      logger.warn(`Missing email or Discord name in waitlist form.`);
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
      logger.warn(`Invalid email format: ${email}`);
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
        logger.warn(`Duplicate email on waitlist: ${email}`);
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
        logger.warn(`Duplicate Discord name on waitlist: ${discordName}`);
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

      const countRes = await db.query(
        `SELECT COUNT(*)::int AS count FROM users`
      );
      const currentPlayers = countRes?.rows?.[0]?.count ?? 0;

      const limit = parseInt(process.env.PLAYER_LIMIT ?? "0", 10);
      const hasCapacity = Number.isFinite(limit) && limit > currentPlayers;

      logger.info(
        `Waitlist entry added: ${email} (${discordName}) — players=${currentPlayers}, limit=${limit}, hasCapacity=${hasCapacity}`
      );

      if (hasCapacity) {
        const inviteResult = await autoInviteAndNotify(
          {
            id: entry.id,
            email: entry.email,
            discord_name: entry.discord_name,
          },
          client,
          db
        );

        let token = inviteResult?.token;

        if (
          !inviteResult?.ok &&
          /already invited/i.test(inviteResult?.msg || "")
        ) {
          const tRes = await db.query(
            `SELECT token FROM waitlist_emails WHERE id = $1`,
            [entry.id]
          );
          token = tRes?.rows?.[0]?.token || null;
          if (token) {
            return res.json({
              success: true,
              entry,
              autoInvited: true,
              token,
              redirectUrl: `/invite/${encodeURIComponent(token)}`,
              message:
                "You were auto-invited earlier. We’ve re-used your token.",
            });
          }
        }

        if (!inviteResult?.ok) {
          logger.warn(
            `Auto-invite failed for ${discordName}: ${
              inviteResult?.msg || "Unknown error"
            }`
          );
          return res.json({
            success: true,
            entry,
            autoInvited: true,
            message:
              "We attempted to auto-invite you, but there was an issue. Admins have been notified.",
          });
        }

        token = token || inviteResult.token;
        return res.json({
          success: true,
          entry,
          autoInvited: true,
          token,
          redirectUrl: `/invite/${encodeURIComponent(token)}`,
          message:
            "You were auto-invited. Check your email for the invite link.",
        });
      } else {
        await notifyAdminWaitlist(entry, client);
        return res.json({
          success: true,
          entry,
          autoInvited: false,
          message:
            "✅ Thanks! We've added you to the waitlist. We'll contact you when a spot opens up.",
        });
      }
    } catch (error) {
      logger.error(`Failed to insert waitlist entry for ${email}:`, error);
      res.status(500).json({
        error:
          "Error submitting waitlist entry.\nIf you're having trouble, contact admin@create-rington.com",
      });
    }
  });

  return router;
}
