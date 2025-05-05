import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../logger.js";
import logError from "./logError.js";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function notifyAdminWaitlist({ email, discordName }) {
  const mailOptions = {
    from: `"Createrington" <${process.env.EMAIL_ADDRESS}>`,
    to: process.env.NOTIFY_ADMIN_EMAIL,
    subject: `📥 New Waitlist Submission: ${discordName}`,
    text: `New waitlist entry:\nDiscord: ${discordName}\nEmail: ${email}`,
    html: `
      <p><strong>New waitlist submission received!</strong></p>
      <ul>
        <li><strong>Discord:</strong> ${discordName}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`📧 Admin notified of new waitlist entry: ${discordName}`);
  } catch (error) {
    logger.error(`❌ Failed to notify admin: ${logError(error)}`);
  }
}
