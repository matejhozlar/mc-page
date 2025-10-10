import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";
import logger from "../../../logger";
import type { Pool, PoolClient } from "pg";

type Db = Pool | PoolClient;

export type InviteResult =
  | { ok: true; code: 200 }
  | { ok: false; code: 400 | 404 | 500; msg: string };

interface WaitlistRow {
  email: string;
  discord_name: string;
  token: string | null;
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

export async function sendInviteById(
  db: Db,
  id: string,
  env: NodeJS.ProcessEnv
): Promise<InviteResult> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const logo = path.join(__dirname, "..", "..", "routes", "assets", "logo.png");

  const result = await db.query<WaitlistRow>(
    `SELECT email, discord_name, token FROM waitlist_emails WHERE id = $1`,
    [id]
  );
  if (result.rowCount === 0) return { ok: false, code: 404, msg: "Not found" };

  const { email, discord_name, token } = result.rows[0] as WaitlistRow;
  if (token) return { ok: false, code: 400, msg: "Already invited" };

  let host: string, port: number, user: string, pass: string, fromAddr: string;
  try {
    host = requireEnv(env, "EMAIL_HOST");
    user = requireEnv(env, "EMAIL_ADDRESS");
    pass = requireEnv(env, "EMAIL_PASSWORD");
    fromAddr = env.EMAIL_FROM ?? "admin@create-rington.com";
    const portStr = requireEnv(env, "EMAIL_PORT");
    port = Number.parseInt(portStr, 10);
    if (!Number.isFinite(port) || port <= 0)
      throw new Error("EMAIL_PORT must be a positive integer");
  } catch (err) {
    return { ok: false, code: 500, msg: (err as Error).message };
  }

  const newToken = uuidv4();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });

  const mailOptions = {
    from: fromAddr,
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
      <p>To join, follow the instructions in the invite link below. If we don’t hear back within 48 hours, the spot may be offered to the next person in the queue.</p>

      <p><a href="https://discord.gg/7PAptNgqk2">Join our Discord</a></p>
      <p><em>Your verification token: <strong>${newToken}</strong></em></p>

      <p>Looking forward to seeing you in-game and watching your creations come to life!</p>
      <p>This is an automated message, please do not reply</p>
      <p>If you need help, contact me on Discord: matejhoz</p>

      <p>Best regards,<br />
      <strong>saunhardy</strong><br />
      Server Admin – Createrington<br />
      <a href="https://create-rington.com/">create-rington.com</a></p>

      <p><img src="cid:createrington-logo" alt="Createrington Logo" style="width: 200px; margin-top: 1rem;" /></p>
    `,
    attachments: [
      { filename: "logo.png", path: logo, cid: "createrington-logo" },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    await db.query(`UPDATE waitlist_emails SET token = $1 WHERE id = $2`, [
      newToken,
      id,
    ]);
    logger.info(`Invite sent to ${email} (${discord_name})`);
    return { ok: true, code: 200 };
  } catch (err) {
    logger.error(
      `sendInviteById failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return { ok: false, code: 500, msg: "Failed to send invite" };
  }
}

export default sendInviteById;
