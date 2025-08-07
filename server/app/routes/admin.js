import express from "express";
import logger from "../../logger.js";
import rconLogger from "../../rconLogger.js";
import { isAdmin } from "../utils/admin/admin.js";
import { Rcon } from "rcon-client";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: process.env.R2_REGION,
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function deleteR2Object(key) {
  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (err) {
    logger.warn(`⚠️ Failed to delete R2 object ${key}: ${err.message}`);
  }
}

export default function adminRoutes(db) {
  const router = express.Router();

  // --- /api/admin/validate ---
  router.get("/admin/validate", async (req, res) => {
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      logger.warn("🔍 Admin validate request without session.");
      return res.status(400).json({ valid: false });
    }

    try {
      const valid = await isAdmin(db, discordId);
      logger.info(`🛂 Admin validate check: ${discordId} => ${valid}`);
      res.json({ valid });
    } catch (error) {
      logger.error(`❌ Admin validation error: ${error}`);
      res.status(500).json({ valid: false });
    }
  });

  // --- /api/admin/logout ---
  router.post("/admin/logout", (req, res) => {
    const discordId = req.cookies.admin_session;
    logger.info(`🚪 Admin logout requested for: ${discordId || "unknown"}`);

    res.clearCookie("admin_session", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    });
    res.status(200).json({ success: true });
  });

  // --- /api/admin/me ---
  router.get("/admin/me", async (req, res) => {
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      logger.warn("👤 /me requested without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`⛔ Non-admin attempted /me: ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT * FROM users WHERE discord_id = $1`,
        [discordId]
      );

      if (result.rows.length === 0) {
        logger.warn(`❓ Admin user not found in users table: ${discordId}`);
        return res.status(404).json({ error: "User not found in database" });
      }

      logger.info(`📥 Admin /me data sent for: ${discordId}`);
      res.json(result.rows[0]);
    } catch (error) {
      logger.error(`Failed to fetch admin user data: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/admin/rcon ---
  router.post("/admin/rcon", async (req, res) => {
    const { command } = req.body;
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      rconLogger.warn("⛔ RCON request denied: no session cookie");
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        rconLogger.warn(`⛔ RCON access denied for non-admin: ${discordId}`);
        return res.status(403).json({ success: false, error: "Not an admin" });
      }

      const userRes = await db.query(
        `SELECT name FROM users WHERE discord_id = $1`,
        [discordId]
      );

      const adminMcName = userRes.rows[0]?.name || "unknown";
      const isSilentCommand = /^\/v get\b/i.test(command);

      if (!isSilentCommand) {
        rconLogger.info(
          `🔐 RCON command received from ${adminMcName} (${discordId}): ${command}`
        );
      }

      const rcon = await Rcon.connect({
        host: process.env.SERVER_IP,
        port: parseInt(process.env.RCON_PORT),
        password: process.env.RCON_PASSWORD,
      });

      const response = await rcon.send(command);
      await rcon.end();

      if (!isSilentCommand) {
        await db.query(
          `INSERT INTO rcon_logs (discord_id, mc_name, command) VALUES ($1, $2, $3)`,
          [discordId, adminMcName, command]
        );

        rconLogger.info(`✅ RCON command executed successfully: ${command}`);
      }

      return res.json({ success: true, response });
    } catch (error) {
      rconLogger.error(`❌ RCON execution failed for ${discordId}: ${error}`);
      return res.status(500).json({ success: false, error: "RCON failure" });
    }
  });

  // --- /api/admin/users ---
  router.get("/admin/users", async (req, res) => {
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      logger.warn("⛔ Attempt to access /admin/users without session cookie");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(
          `⛔ Unauthorized /admin/users access attempt by ${discordId}`
        );
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT uuid, name, play_time_seconds, last_seen, online FROM users ORDER BY name ASC`
      );

      logger.info(`📊 Admin ${discordId} fetched user list.`);
      res.json({ users: result.rows });
    } catch (error) {
      logger.error(`Failed to fetch users: ${error}`);
      res.status(500).json({ error: "Database error" });
    }
  });

  // --- GET /api/admin/vanish-status ---
  router.get("/admin/vanish-status", async (req, res) => {
    const discordId = req.cookies.admin_session;

    if (!discordId) {
      logger.warn("⛔ /vanish-status requested without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`⛔ Non-admin attempted vanish status check: ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT vanished FROM admins WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      if (result.rows.length === 0) {
        logger.warn(`❓ Admin not found in DB: ${discordId}`);
        return res.status(404).json({ error: "Admin not found" });
      }

      res.json({ vanished: result.rows[0].vanished });
    } catch (error) {
      logger.error(`❌ Failed to fetch vanish status: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- POST /api/admin/vanish-status---
  router.post("/admin/vanish-status", async (req, res) => {
    const discordId = req.cookies.admin_session;
    const { name, vanished } = req.body;

    if (!discordId) {
      logger.warn("⛔ /vanish-status update attempted without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (typeof vanished !== "boolean") {
      return res.status(400).json({ error: "Invalid vanish value" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`⛔ Non-admin tried to update vanish: ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const rcon = await Rcon.connect({
        host: process.env.SERVER_IP,
        port: parseInt(process.env.RCON_PORT),
        password: process.env.RCON_PASSWORD,
      });

      const response = await rcon.send(`/v get ${name}`);
      await rcon.end();

      if (/no player found/i.test(response)) {
        logger.warn(`⛔ Player ${name} not online — vanish not updated.`);
        return res
          .status(400)
          .json({ error: "Player must be online to update vanish status." });
      }

      await db.query(`UPDATE admins SET vanished = $1 WHERE discord_id = $2`, [
        vanished,
        discordId,
      ]);

      logger.info(`🟢 Vanish status updated: ${name} → ${vanished}`);
      res.json({ success: true });
    } catch (error) {
      logger.error(`❌ Failed to update vanish status: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- POST /api/admin/send-invite ---
  router.post("/admin/send-invite", async (req, res) => {
    const discordId = req.cookies.admin_session;
    const { id } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    // Resolve __dirname manually for ESM
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const logo = path.join(__dirname, "assets", "logo.png");

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const result = await db.query(
        `SELECT email, discord_name, token FROM waitlist_emails WHERE id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Waitlist entry not found" });
      }

      const { email, discord_name, token } = result.rows[0];

      if (token) {
        return res.status(400).json({ error: "User already invited" });
      }

      const newToken = uuidv4();

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: false,
        auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: "admin@create-rington.com",
        to: email,
        subject: "🎉 Your Invitation to Createrington is Ready!",
        html: `
        <p>Hi <strong>${discord_name}</strong>,</p>
        <p>Great news — a spot has just opened up on <strong>Createrington</strong>, and you're next in line! We’re excited to welcome you to the server and can't wait to see what you’ll create.</p>
      
        <h3>🌍 What is Createrington?</h3>
        <p>Createrington is a carefully curated Minecraft Create mod server focused on mechanical innovation, aesthetic building, and quality-of-life improvements. With a Vanilla+ feel and a vibrant, collaborative community, it’s the perfect place to bring your most imaginative ideas to life.</p>
      
        <h3>🛠️ Highlights of the Experience:</h3>
        <ul>
          <li>Advanced automation with Create & its add-ons</li>
          <li>Gorgeous builds using Macaw’s, Chipped, and Rechiseled</li>
          <li>Expanded food options with Farmer’s Delight and more</li>
          <li>Optimized performance and smooth visuals</li>
          <li>Seamless multiplayer with FTB Teams and Simple Voice Chat</li>
        </ul>
      
        <p>We’re currently running our latest modpack on CurseForge, built specifically to enhance both creativity and performance.</p>
      
        <h3>🔗 Next Steps:</h3>
        <p>To join, just reply to this email or follow the instructions in the invite link below. If we don’t hear back within 48 hours, the spot may be offered to the next person in the queue.</p>
      
        <p><a href="https://discord.gg/7PAptNgqk2">Join our Discord</a></p>
        <p><em>Your verification token: <strong>${newToken}</strong></em></p>
      
        <p>Looking forward to seeing you in-game and watching your creations come to life!</p>
      
        <p>Best regards,<br />
        <strong>saunhardy</strong><br />
        Server Admin – Createrington<br />
        <a href="https://create-rington.com/">create-rington.com</a></p>
      
        <p><img src="cid:createrington-logo" alt="Createrington Logo" style="width: 200px; margin-top: 1rem;" /></p>
      `,
        attachments: [
          {
            filename: "logo.png",
            path: logo,
            cid: "createrington-logo",
          },
        ],
      };

      await transporter.sendMail(mailOptions);

      await db.query(`UPDATE waitlist_emails SET token = $1 WHERE id = $2`, [
        newToken,
        id,
      ]);

      logger.info(`✅ Successfully sent invite to ${email} (${discord_name}).`);
      logger.info(`🔑 Token generated: ${token}`);
      res.json({ success: true });
    } catch (error) {
      logger.error(`❌ Failed to send invite: ${error}`);
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  router.get("/admin/waitlist", async (req, res) => {
    const discordId = req.cookies.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const result = await db.query(
        `SELECT id, email, discord_name, token, submitted_at FROM waitlist_emails ORDER BY submitted_at ASC`
      );
      logger.info(`📊 Admin ${discordId} fetched waitlist list.`);
      res.json({ entries: result.rows });
    } catch (error) {
      logger.error(`❌ Failed to fetch waitlist: ${error}`);
      res.status(500).json({ error: "Failed to load waitlist" });
    }
  });

  router.get("/admin/pending-companies/:id", async (req, res) => {
    const discordId = req.cookies.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const { rows } = await db.query(
        `SELECT
        pc.id,
        pc.name,
        pc.description,
        pc.short_description,
        pc.created_at,
        pc.logo_url,
        pc.banner_url,
        pc.gallery_urls,
        pc.founder_uuid,
        u.name AS owner_name
      FROM pending_companies pc
      JOIN users u ON pc.founder_uuid = u.uuid
      WHERE pc.id = $1`,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({ error: "Pending company not found" });
      }

      res.json(rows[0]);
    } catch (err) {
      logger.error(`❌ Failed to fetch pending company ${id}: ${err}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/pending-companies/:id/approve
  router.post("/admin/pending-companies/:id/approve", async (req, res) => {
    const discordId = req.cookies.admin_session;
    const id = parseInt(req.params.id, 10);

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const {
        rows: [adminUser],
      } = await db.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      if (!adminUser) {
        return res.status(404).json({ error: "Admin user not found" });
      }

      const adminUuid = adminUser.uuid;

      const {
        rows: [pending],
      } = await db.query(
        `SELECT * FROM pending_companies WHERE id = $1 AND status = 'pending'`,
        [id]
      );

      if (!pending) {
        return res
          .status(404)
          .json({ error: "Pending company not found or already processed" });
      }

      await db.query(
        `UPDATE pending_companies
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
       WHERE id = $2`,
        [adminUuid, id]
      );

      await db.query(
        `INSERT INTO companies (id, founder_uuid, name, description, short_description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pending.id,
          pending.founder_uuid,
          pending.name,
          pending.description,
          pending.short_description,
          pending.created_at,
        ]
      );

      await db.query(
        `INSERT INTO company_funds (company_id, balance)
       VALUES ($1, 0)`,
        [pending.id]
      );

      await db.query(
        `INSERT INTO company_members (user_uuid, company_id, role)
       VALUES ($1, $2, 'Founder')`,
        [pending.founder_uuid, pending.id]
      );

      const imageInsertPromises = [];

      if (pending.logo_url) {
        imageInsertPromises.push(
          db.query(
            `INSERT INTO company_images (company_id, url, type, position)
       VALUES ($1, $2, 'logo', 0)`,
            [pending.id, pending.logo_url]
          )
        );
      }

      if (pending.banner_url) {
        imageInsertPromises.push(
          db.query(
            `INSERT INTO company_images (company_id, url, type, position)
       VALUES ($1, $2, 'banner', 0)`,
            [pending.id, pending.banner_url]
          )
        );
      }

      if (Array.isArray(pending.gallery_urls)) {
        pending.gallery_urls.forEach((url, index) => {
          if (url) {
            imageInsertPromises.push(
              db.query(
                `INSERT INTO company_images (company_id, url, type, position)
           VALUES ($1, $2, 'gallery', $3)`,
                [pending.id, url, index]
              )
            );
          }
        });
      }

      await Promise.all(imageInsertPromises);

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error(`❌ Failed to approve company ${id}: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/pending-companies/:id/reject
  router.post("/admin/pending-companies/:id/reject", async (req, res) => {
    const discordId = req.cookies.admin_session;
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const {
        rows: [pending],
      } = await db.query(
        `SELECT * FROM pending_companies WHERE id = $1 AND status = 'pending'`,
        [id]
      );

      if (!pending) {
        return res
          .status(404)
          .json({ error: "Pending company not found or already processed" });
      }

      const extractKey = (url) => {
        const prefix = "https://market-assets.create-rington.com/";
        return url?.startsWith(prefix) ? url.substring(prefix.length) : null;
      };

      const allKeys = [
        extractKey(pending.logo_url),
        extractKey(pending.banner_url),
        ...(pending.gallery_urls || []).map(extractKey),
      ].filter(Boolean);

      await Promise.all(allKeys.map(deleteR2Object));

      await db.query(
        `INSERT INTO rejected_companies (id, founder_uuid, name, reason, rejected_at)
       VALUES ($1, $2, $3, $4, NOW())`,
        [pending.id, pending.founder_uuid, pending.name, reason.trim()]
      );

      await db.query(`DELETE FROM pending_companies WHERE id = $1`, [id]);

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error(`❌ Failed to reject company ${id}: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- GET /api/admin/pending-companies ---
  router.get("/admin/pending-companies", async (req, res) => {
    const discordId = req.cookies.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const { rows } = await db.query(
        `SELECT
        pc.id,
        pc.name,
        pc.short_description,
        pc.created_at,
        pc.logo_url,
        u.name AS owner_name
      FROM pending_companies pc
      JOIN users u ON pc.founder_uuid = u.uuid
      WHERE pc.status = 'pending'
      ORDER BY pc.created_at ASC`
      );

      res.json({ companies: rows });
    } catch (err) {
      logger.error(`❌ Failed to fetch pending companies: ${err}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
