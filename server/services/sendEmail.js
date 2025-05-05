// sendEmail.js
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../logger.js";
import logError from "../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

// Setup DB connection
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
await db.connect();

// Setup email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Resolve __dirname manually for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 Logo path as import-like clean variable
const logo = path.join(__dirname, "assets", "logo.png");

// Main logic
async function main() {
  const id = process.argv[2];

  if (!id) {
    logger.error(
      "❌ Error: Please provide an ID.\nUsage: node sendEmail.js <id>"
    );
    process.exit(1);
  }

  try {
    const result = await db.query(
      `SELECT email, discord_name FROM waitlist_emails WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      logger.error("❌ No waitlist entry found for that ID.");
      process.exit(1);
    }

    const { email, discord_name } = result.rows[0];
    const token = uuidv4();

    await db.query(`UPDATE waitlist_emails SET token = $1 WHERE id = $2`, [
      token,
      id,
    ]);

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

  <p><a href="https://discord.gg/6T246zeZW6">Join our Discord</a></p>
  <p><em>Your verification token: <strong>${token}</strong></em></p>

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

    logger.info(`✅ Successfully sent invite to ${email} (${discord_name}).`);
    logger.info(`🔑 Token generated: ${token}`);
  } catch (error) {
    logger.error(`❌ Failed to send invite: ${logError(error)}`);
  } finally {
    await db.end();
    process.exit(0);
  }
}

main();
