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
import { getCompanyCreationFee } from "../utils/market/fees/getCompanyCreationFee.js";
import { sendDm } from "../utils/discord/sendDm.js";
import { runOnlyInProduction } from "../../utils/production/onlyInProduction.js";

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
  } catch (error) {
    logger.warn(`Failed to delete R2 object ${key}: ${error.message}`);
  }
}

function keyFromPublicUrl(url) {
  const prefix = "https://market-assets.create-rington.com/";
  return url?.startsWith(prefix) ? url.slice(prefix.length) : null;
}

function getShopCreationFee(existingShopCountForCompany) {
  return 10 + 50 * (existingShopCountForCompany || 0);
}

export default function adminRoutes(db, clientBot) {
  const router = express.Router();

  // --- /api/admin/validate ---
  router.get("/admin/validate", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;

    if (!discordId) {
      logger.warn("Admin validate request without session.");
      return res.status(400).json({ valid: false });
    }

    try {
      const valid = await isAdmin(db, discordId);
      logger.info(`Admin validate check: ${discordId} => ${valid}`);
      res.json({ valid });
    } catch (error) {
      logger.error(`Admin validation error: ${error}`);
      res.status(500).json({ valid: false });
    }
  });

  // --- /api/admin/logout ---
  router.post("/admin/logout", (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    logger.info(`Admin logout requested for: ${discordId || "unknown"}`);

    res.clearCookie("admin_session", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      signed: true,
    });
    res.status(200).json({ success: true });
  });

  // --- /api/admin/me ---
  router.get("/admin/me", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;

    if (!discordId) {
      logger.warn("/me requested without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`Non-admin attempted /me: ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT * FROM users WHERE discord_id = $1`,
        [discordId]
      );

      if (result.rows.length === 0) {
        logger.warn(`Admin user not found in users table: ${discordId}`);
        return res.status(404).json({ error: "User not found in database" });
      }

      logger.info(`Admin /me data sent for: ${discordId}`);
      res.json(result.rows[0]);
    } catch (error) {
      logger.error(`Failed to fetch admin user data: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- /api/admin/rcon ---
  router.post("/admin/rcon", async (req, res) => {
    const { command } = req.body;
    const discordId = req.signedCookies?.admin_session;

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
    const discordId = req.signedCookies?.admin_session;

    if (!discordId) {
      logger.warn("Attempt to access /admin/users without session cookie");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`Unauthorized /admin/users access attempt by ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT uuid, name, play_time_seconds, last_seen, online FROM users ORDER BY name ASC`
      );

      logger.info(`Admin ${discordId} fetched user list.`);
      res.json({ users: result.rows });
    } catch (error) {
      logger.error(`Failed to fetch users: ${error}`);
      res.status(500).json({ error: "Database error" });
    }
  });

  // --- GET /api/admin/vanish-status ---
  router.get("/admin/vanish-status", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;

    if (!discordId) {
      logger.warn("/vanish-status requested without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`Non-admin attempted vanish status check: ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const result = await db.query(
        `SELECT vanished FROM admins WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      if (result.rows.length === 0) {
        logger.warn(`Admin not found in DB: ${discordId}`);
        return res.status(404).json({ error: "Admin not found" });
      }

      res.json({ vanished: result.rows[0].vanished });
    } catch (error) {
      logger.error(`Failed to fetch vanish status: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- POST /api/admin/vanish-status---
  router.post("/admin/vanish-status", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const { name, vanished } = req.body;

    if (!discordId) {
      logger.warn("/vanish-status update attempted without session.");
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (typeof vanished !== "boolean") {
      return res.status(400).json({ error: "Invalid vanish value" });
    }

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`Non-admin tried to update vanish: ${discordId}`);
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
        logger.warn(`Player ${name} not online — vanish not updated.`);
        return res
          .status(400)
          .json({ error: "Player must be online to update vanish status." });
      }

      await db.query(`UPDATE admins SET vanished = $1 WHERE discord_id = $2`, [
        vanished,
        discordId,
      ]);

      logger.info(`Vanish status updated: ${name} → ${vanished}`);
      res.json({ success: true });
    } catch (error) {
      logger.error(`Failed to update vanish status: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- POST /api/admin/send-invite ---
  router.post("/admin/send-invite", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const { id } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

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

      logger.info(`Successfully sent invite to ${email} (${discord_name}).`);
      logger.info(`Token generated: ${token}`);
      res.json({ success: true });
    } catch (error) {
      logger.error(`Failed to send invite: ${error}`);
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  router.get("/admin/waitlist", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const result = await db.query(
        `SELECT id, email, discord_name, token, submitted_at FROM waitlist_emails ORDER BY submitted_at ASC`
      );
      logger.info(`Admin ${discordId} fetched waitlist list.`);
      res.json({ entries: result.rows });
    } catch (error) {
      logger.error(`Failed to fetch waitlist: ${error}`);
      res.status(500).json({ error: "Failed to load waitlist" });
    }
  });

  router.get("/admin/pending-companies/:id", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
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
    } catch (error) {
      logger.error(`Failed to fetch pending company ${id}: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/pending-companies/:id/approve
  router.post("/admin/pending-companies/:id/approve", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const id = parseInt(req.params.id, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const client = await db.connect();
    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      await client.query("BEGIN");

      const {
        rows: [adminUser],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      const {
        rows: [pending],
      } = await client.query(
        `SELECT * FROM pending_companies
         WHERE id = $1 AND status IN ('pending','awaiting_funds')
         FOR UPDATE`,
        [id]
      );
      if (!pending) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ error: "Pending company not found or already processed" });
      }

      const {
        rows: [founderUser],
      } = await client.query(
        `SELECT discord_id FROM users WHERE uuid = $1 LIMIT 1`,
        [pending.founder_uuid]
      );

      const {
        rows: [cnt],
      } = await client.query(
        `SELECT COUNT(*)::int AS n FROM companies WHERE founder_uuid = $1`,
        [pending.founder_uuid]
      );
      const alreadyOwned = cnt?.n ?? 0;

      const fee = getCompanyCreationFee(alreadyOwned);

      await client.query(
        `UPDATE pending_companies
         SET status = 'awaiting_funds',
             fee_required = $1,
             fee_checked_at = NOW(),
             reviewed_at = NOW(),
             reviewed_by = $2
       WHERE id = $3`,
        [fee, adminUser.uuid, id]
      );

      await client.query("COMMIT");

      runOnlyInProduction(async () => {
        (async () => {
          if (!founderUser?.discord_id) return;
          const lines = [
            `✅ Your company submission **${pending.name}** is approved (pending payment).`,
            ``,
            `• Company ID: ${pending.id}`,
            `• Required fee: ${fee}`,
            ``,
            `Please complete payment in the market/requests to finalize creation.`,
          ];
          await sendDm(founderUser.discord_id, lines.join("\n"), clientBot);
        })().catch((error) =>
          logger.warn(
            `post-commit DM failed for pending company ${id}: ${error}`
          )
        );
      });

      return res
        .status(200)
        .json({ success: true, status: "awaiting_funds", required: fee });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Admin approve->awaiting_funds error: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // POST /api/admin/pending-companies/:id/reject
  router.post("/admin/pending-companies/:id/reject", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
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

      const {
        rows: [founderUser],
      } = await db.query(
        `SELECT discord_id FROM users WHERE uuid = $1 LIMIT 1`,
        [pending.founder_uuid]
      );

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

      runOnlyInProduction(async () => {
        (async () => {
          if (!founderUser?.discord_id) return;
          const lines = [
            `❌ Your company submission **${pending.name}** was rejected.`,
            ``,
            `• Company ID: ${pending.id}`,
            `• Reason:\n ${reason.trim()}`,
            ``,
            `You can resubmit after addressing the feedback.`,
          ];
          await sendDm(founderUser.discord_id, lines.join("\n"), clientBot);
        })().catch((e) =>
          logger.warn(`post-reject DM failed for pending company ${id}: ${e}`)
        );
      });

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error(`Failed to reject company ${id}: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- GET /api/admin/pending-companies ---
  router.get("/admin/pending-companies", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const { rows } = await db.query(
        `
              SELECT
          pc.id,
          pc.name,
          pc.short_description,
          pc.created_at,
          pc.logo_url,
          pc.founder_uuid,             
          u.name AS owner_name,
          'new' AS type
        FROM pending_companies pc
        JOIN users u ON pc.founder_uuid = u.uuid
        WHERE pc.status = 'pending'

        UNION ALL

        SELECT
          ce.id,
          COALESCE(ce.name, c.name) AS name,
          ce.short_description,
          ce.created_at,
          ce.logo_path AS logo_url,
          NULL AS founder_uuid,         
          u.name AS owner_name,
          'edit' AS type
        FROM company_edits ce
        JOIN companies c ON ce.company_id = c.id
        JOIN users u ON ce.editor_uuid = u.uuid
        WHERE ce.status = 'pending'

        ORDER BY created_at ASC
      `
      );

      res.json({ companies: rows });
    } catch (error) {
      logger.error(`Failed to fetch pending companies/edits: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/company-edits/:id
  router.get("/admin/company-edits/:id", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    const editId = parseInt(req.params.id, 10);
    if (isNaN(editId)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const { rows: edits } = await db.query(
        `
      SELECT ce.*, u.name AS editor_name
      FROM company_edits ce
      JOIN users u ON u.uuid = ce.editor_uuid
      WHERE ce.id = $1 AND ce.status = 'pending'
      `,
        [editId]
      );
      if (!edits.length) {
        return res
          .status(404)
          .json({ error: "Pending company edit not found" });
      }
      const edit = edits[0];

      const { rows: originals } = await db.query(
        `SELECT * FROM companies WHERE id = $1`,
        [edit.company_id]
      );
      if (!originals.length) {
        return res.status(404).json({ error: "Original company not found" });
      }

      res.json({ edit, original: originals[0] });
    } catch (error) {
      logger.error(`Failed to fetch company edit ${editId}: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/company-edits/:id/approve
  router.post("/admin/company-edits/:id/approve", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const id = parseInt(req.params.id, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const client = await db.connect();
    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      await client.query("BEGIN");

      const {
        rows: [adminUser],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id = $1 LIMIT 1`,
        [discordId]
      );

      const {
        rows: [edit],
      } = await client.query(
        `SELECT * FROM company_edits WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [id]
      );
      if (!edit) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Edit not found or processed" });
      }

      const {
        rows: [editorUser],
      } = await client.query(
        `SELECT discord_id FROM users WHERE uuid = $1 LIMIT 1`,
        [edit.editor_uuid]
      );

      const fee = 20;

      await client.query(
        `UPDATE company_edits
         SET status = 'awaiting_funds',
             fee_required = $1,
             fee_checked_at = NOW(),
             reviewed_at = NOW(),
             reviewed_by = $2
       WHERE id = $3`,
        [fee, adminUser.uuid, id]
      );

      await client.query("COMMIT");

      runOnlyInProduction(async () => {
        (async () => {
          if (!editorUser?.discord_id) return;
          const lines = [
            `✅ Your company edit request is approved (pending payment).`,
            ``,
            `• Edit ID: ${edit.id}`,
            `• Company ID: ${edit.company_id}`,
            `• Required fee: ${fee}`,
            ``,
            `Please complete payment in market/requests to apply the changes.`,
          ];
          await sendDm(editorUser.discord_id, lines.join("\n"), clientBot);
        })().catch((e) =>
          logger.warn(`post-commit DM failed for company edit ${id}: ${e}`)
        );
      });

      return res.json({
        success: true,
        status: "awaiting_funds",
        required: fee,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Edit approve->awaiting_funds error: ${error}`);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // POST /api/admin/company-edits/:id/reject
  router.post("/admin/company-edits/:id/reject", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    if (!reason || !reason.trim())
      return res.status(400).json({ error: "Reason required" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const {
        rows: [edit],
      } = await db.query(
        `SELECT * FROM company_edits WHERE id = $1 AND status = 'pending'`,
        [id]
      );
      if (!edit) {
        return res.status(404).json({ error: "Edit not found or processed" });
      }

      const {
        rows: [editorUser],
      } = await db.query(
        `SELECT discord_id FROM users WHERE uuid = $1 LIMIT 1`,
        [edit.editor_uuid]
      );

      const keys = [
        keyFromPublicUrl(edit.logo_path),
        keyFromPublicUrl(edit.banner_path),
        ...(edit.gallery_paths ?? []).map(keyFromPublicUrl),
      ].filter(Boolean);

      await Promise.all(
        keys.map((Key) =>
          r2
            .send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key,
              })
            )
            .catch((error) =>
              logger.warn(`R2 delete failed for ${Key}: ${error.message}`)
            )
        )
      );

      await db.query(
        `INSERT INTO rejected_company_edits (id, company_id, editor_uuid, reason)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING`,
        [edit.id, edit.company_id, edit.editor_uuid, reason.trim()]
      );

      await db.query(
        `UPDATE company_edits
         SET status='rejected', reason=$1, reviewed_at=NOW()
       WHERE id=$2`,
        [reason.trim(), id]
      );

      runOnlyInProduction(async () => {
        (async () => {
          if (!editorUser?.discord_id) return;
          const lines = [
            `❌ Your company edit request was rejected.`,
            ``,
            `• Edit ID: ${edit.id}`,
            `• Company ID: ${edit.company_id}`,
            `• Reason:\n ${reason.trim()}`,
            ``,
            `You can submit a new edit after addressing the feedback.`,
          ];
          await sendDm(editorUser.discord_id, lines.join("\n"), clientBot);
        })().catch((e) =>
          logger.warn(`post-reject DM failed for company edit ${id}: ${e}`)
        );
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error(`Reject company edit ${id}: ${error}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- GET /api/admin/pending-shops ---
  router.get("/admin/pending-shops", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const admin = await isAdmin(db, discordId);
      if (!admin) return res.status(403).json({ error: "Not an admin" });

      const { rows: newRows } = await db.query(
        `
      SELECT
        ps.id,
        ps.name,
        ps.short_description,
        ps.created_at,
        ps.logo_url,
        ps.founder_uuid,
        u.name AS owner_name,
        c.name AS company_name,
        ps.company_id,
        'new' AS type
      FROM pending_shops ps
      JOIN users u ON ps.founder_uuid = u.uuid
      JOIN companies c ON c.id = ps.company_id
      WHERE ps.status = 'pending'
      ORDER BY ps.created_at ASC
      `
      );

      const { rows: editRows } = await db.query(
        `
      SELECT
        se.id,
        COALESCE(se.name, s.name) AS name,
        COALESCE(se.short_description, s.short_description) AS short_description,
        se.created_at,
        se.logo_path AS logo_url,                     -- staged preview
        se.editor_uuid AS founder_uuid,               -- keep field name for UI parity
        u.name AS owner_name,
        c.name AS company_name,
        s.company_id,
        'edit' AS type
      FROM shop_edits se
      JOIN shops s      ON s.id = se.shop_id
      JOIN companies c  ON c.id = s.company_id
      JOIN users u      ON u.uuid = se.editor_uuid
      WHERE se.status = 'pending'
      ORDER BY se.created_at ASC
      `
      );

      const shops = [...newRows, ...editRows].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      res.json({ shops });
    } catch (error) {
      logger.error(`Failed to fetch pending shops: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- GET /api/admin/pending-shops/:id ---
  router.get("/admin/pending-shops/:id", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const admin = await isAdmin(db, discordId);
      if (!admin) return res.status(403).json({ error: "Not an admin" });

      const { rows } = await db.query(
        `
        SELECT
          ps.id,
          ps.company_id,
          c.name AS company_name,
          ps.name,
          ps.description,
          ps.short_description,
          ps.created_at,
          ps.logo_url,
          ps.banner_url,
          ps.gallery_urls,
          ps.founder_uuid,
          u.name AS owner_name,
          ps.status
        FROM pending_shops ps
        JOIN companies c ON c.id = ps.company_id
        JOIN users u ON ps.founder_uuid = u.uuid
        WHERE ps.id = $1
        `,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({ error: "Pending shop not found" });
      }

      res.json(rows[0]);
    } catch (error) {
      logger.error(`Failed to fetch pending shop ${id}: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- POST /api/admin/pending-shops/:id/approve ---
  router.post("/admin/pending-shops/:id/approve", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const id = parseInt(req.params.id, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const client = await db.connect();
    try {
      const admin = await isAdmin(db, discordId);
      if (!admin) {
        client.release();
        return res.status(403).json({ error: "Not an admin" });
      }

      await client.query("BEGIN");

      const {
        rows: [adminUser],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`,
        [discordId]
      );
      if (!adminUser) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ error: "Admin user not found" });
      }

      const {
        rows: [pending],
      } = await client.query(
        `
        SELECT *
        FROM pending_shops
        WHERE id=$1 AND status IN ('pending','awaiting_funds')
        FOR UPDATE
        `,
        [id]
      );
      if (!pending) {
        await client.query("ROLLBACK");
        client.release();
        return res
          .status(404)
          .json({ error: "Pending shop not found or already processed" });
      }

      const {
        rows: [cnt],
      } = await client.query(
        `SELECT COUNT(*)::int AS n FROM shops WHERE company_id=$1`,
        [pending.company_id]
      );
      const fee = getShopCreationFee(cnt?.n ?? 0);

      await client.query(
        `
        UPDATE pending_shops
        SET status='awaiting_funds',
            fee_required=$1,
            fee_checked_at=NOW(),
            reviewed_at=NOW(),
            reviewed_by=$2
        WHERE id=$3
        `,
        [fee, adminUser.uuid, id]
      );

      await client.query("COMMIT");

      try {
        const {
          rows: [founderUser],
        } = await db.query(
          `SELECT discord_id FROM users WHERE uuid=$1 LIMIT 1`,
          [pending.founder_uuid]
        );
        if (!founderUser?.discord_id) return;

        const lines = [
          `✅ Your shop submission **${pending.name}** is approved (pending payment).`,
          ``,
          `• Shop ID: ${pending.id}`,
          `• Company ID: ${pending.company_id}`,
          `• Required fee: ${fee}`,
          ``,
          `Please complete payment in market/requests to finalize creation.`,
        ];
        await sendDm(founderUser.discord_id, lines.join("\n"), clientBot);
      } catch (e) {
        logger.warn(`post-approve DM failed for pending shop ${id}: ${e}`);
      }

      return res
        .status(200)
        .json({ success: true, status: "awaiting_funds", required: fee });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Admin approve shop->awaiting_funds error: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // --- POST /api/admin/pending-shops/:id/reject ---
  router.post("/admin/pending-shops/:id/reject", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body || {};

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const client = await db.connect();
    try {
      const admin = await isAdmin(db, discordId);
      if (!admin) {
        client.release();
        return res.status(403).json({ error: "Not an admin" });
      }

      await client.query("BEGIN");

      const {
        rows: [pending],
      } = await client.query(
        `SELECT * FROM pending_shops WHERE id=$1 AND status='pending' FOR UPDATE`,
        [id]
      );
      if (!pending) {
        await client.query("ROLLBACK");
        client.release();
        return res
          .status(404)
          .json({ error: "Pending shop not found or already processed" });
      }

      const extractKey = (url) => {
        const prefix = "https://market-assets.create-rington.com/";
        return url?.startsWith(prefix) ? url.substring(prefix.length) : null;
      };
      const keys = [
        extractKey(pending.logo_url),
        extractKey(pending.banner_url),
        ...(pending.gallery_urls || []).map(extractKey),
      ].filter(Boolean);

      await Promise.allSettled(keys.map((k) => deleteR2Object(k)));

      await client.query(
        `INSERT INTO rejected_shops (id, company_id, founder_uuid, name, reason, rejected_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          pending.id,
          pending.company_id,
          pending.founder_uuid,
          pending.name,
          reason.trim(),
        ]
      );

      await client.query(
        `UPDATE pending_shops
           SET status='rejected', reviewed_at=NOW()
         WHERE id=$1`,
        [id]
      );

      await client.query("COMMIT");

      try {
        const {
          rows: [founderUser],
        } = await db.query(
          `SELECT discord_id FROM users WHERE uuid=$1 LIMIT 1`,
          [pending.founder_uuid]
        );
        if (!founderUser?.discord_id) return;

        const lines = [
          `❌ Your shop submission **${pending.name}** was rejected.`,
          ``,
          `• Shop ID: ${pending.id}`,
          `• Company ID: ${pending.company_id}`,
          `• Reason:\n ${reason.trim()}`,
          ``,
          `You can resubmit after addressing the feedback.`,
        ];
        await sendDm(founderUser.discord_id, lines.join("\n"), clientBot);
      } catch (e) {
        logger.warn(`post-reject DM failed for pending shop ${id}: ${e}`);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Failed to reject shop ${id}: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // GET --- /api/admin/shop-edits/:id ---
  router.get("/admin/shop-edits/:id", async (req, res) => {
    const editId = parseInt(req.params.id, 10);
    const discordId = req.signedCookies?.admin_session;
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(editId)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const {
        rows: [edit],
      } = await db.query(
        `
      SELECT se.*,
             u.name       AS editor_name,
             u.discord_id AS editor_discord_id
      FROM shop_edits se
      LEFT JOIN users u ON u.uuid = se.editor_uuid
      WHERE se.id = $1
      LIMIT 1
      `,
        [editId]
      );
      if (!edit) return res.status(404).json({ error: "Edit not found" });

      const { rows: originals } = await db.query(
        `
      SELECT
        s.id,
        s.company_id,
        s.name,
        s.short_description,
        s.description,
        (SELECT url FROM shop_images WHERE shop_id=s.id AND type='logo'   ORDER BY position LIMIT 1) AS logo_url,
        (SELECT url FROM shop_images WHERE shop_id=s.id AND type='banner' ORDER BY position LIMIT 1) AS banner_url,
        (SELECT COALESCE(ARRAY_AGG(url ORDER BY position), '{}')
           FROM shop_images WHERE shop_id=s.id AND type='gallery') AS gallery_urls
      FROM shops s
      WHERE s.id=$1
      LIMIT 1
      `,
        [edit.shop_id]
      );

      return res.json({ edit, original: originals[0] || null });
    } catch (error) {
      logger.error(`Failed to fetch shop edit ${editId}: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/shop-edits/:id/approve
  router.post("/admin/shop-edits/:id/approve", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const id = parseInt(req.params.id, 10);
    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const client = await db.connect();
    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      await client.query("BEGIN");

      const {
        rows: [adminUser],
      } = await client.query(
        `SELECT uuid FROM users WHERE discord_id=$1 LIMIT 1`,
        [discordId]
      );

      const {
        rows: [edit],
      } = await client.query(
        `SELECT * FROM shop_edits WHERE id=$1 AND status='pending' FOR UPDATE`,
        [id]
      );
      if (!edit) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Edit not found or processed" });
      }

      const {
        rows: [editorUser],
      } = await client.query(
        `SELECT discord_id FROM users WHERE uuid=$1 LIMIT 1`,
        [edit.editor_uuid]
      );

      const fee = 20;

      await client.query(
        `UPDATE shop_edits
          SET status='awaiting_funds',
              fee_required=$1,
              fee_checked_at=NOW(),
              reviewed_at=NOW(),
              reviewed_by=$2
        WHERE id=$3`,
        [fee, adminUser.uuid, id]
      );

      await client.query("COMMIT");

      runOnlyInProduction(async () => {
        try {
          if (!editorUser?.discord_id) return;
          const lines = [
            `✅ Your shop edit request is approved (pending payment).`,
            ``,
            `• Edit ID: ${edit.id}`,
            `• Shop ID: ${edit.shop_id}`,
            `• Required fee: ${fee}`,
            ``,
            `Please complete payment in market/requests to apply the changes.`,
          ];
          await sendDm(editorUser.discord_id, lines.join("\n"), clientBot);
        } catch (e) {
          logger.warn(`post-commit DM failed for shop edit ${id}: ${e}`);
        }
      });

      res.json({ success: true, status: "awaiting_funds", required: fee });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`shop edit approve->awaiting_funds error: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // POST /api/admin/shop-edits/:id/reject
  router.post("/admin/shop-edits/:id/reject", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!discordId) return res.status(403).json({ error: "Unauthorized" });
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    if (!reason || !reason.trim())
      return res.status(400).json({ error: "Reason required" });

    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) return res.status(403).json({ error: "Not an admin" });

      const {
        rows: [edit],
      } = await db.query(
        `SELECT * FROM shop_edits WHERE id=$1 AND status='pending'`,
        [id]
      );
      if (!edit)
        return res.status(404).json({ error: "Edit not found or processed" });

      await db.query(
        `UPDATE shop_edits SET status='rejected', reviewed_at=NOW() WHERE id=$1`,
        [id]
      );
      await db.query(
        `INSERT INTO rejected_shop_edits (id, shop_id, editor_uuid, reason)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [id, edit.shop_id, edit.editor_uuid, reason]
      );

      runOnlyInProduction(async () => {
        try {
          const {
            rows: [editorUser],
          } = await db.query(
            `SELECT discord_id FROM users WHERE uuid=$1 LIMIT 1`,
            [edit.editor_uuid]
          );
          if (!editorUser?.discord_id) return;

          const lines = [
            `❌ Your shop edit request was rejected.`,
            ``,
            `• Edit ID: ${edit.id}`,
            `• Shop ID: ${edit.shop_id}`,
            ``,
            `Reason:`,
            reason,
          ];
          await sendDm(editorUser.discord_id, lines.join("\n"), clientBot);
        } catch (e) {
          logger.warn(`DM failed for rejected shop edit ${id}: ${e}`);
        }
      });

      res.json({ success: true, status: "rejected" });
    } catch (error) {
      logger.error(`reject shop edit ${id} error: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
