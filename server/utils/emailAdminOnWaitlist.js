import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../logger.js";
import logError from "./logError.js";
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";

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

export async function notifyAdminWaitlist({ id, email, discord_name }, client) {
  const mailOptions = {
    from: `"Createrington" <${process.env.EMAIL_ADDRESS}>`,
    to: process.env.NOTIFY_ADMIN_EMAIL,
    subject: `📥 New Waitlist Submission: ${discord_name}`,
    text: `New waitlist entry:\nDiscord: ${discord_name}\nEmail: ${email}`,
    html: `
      <p><strong>New waitlist submission received!</strong></p>
      <ul>
        <li><strong>ID:</strong> ${id}</li>
        <li><strong>Discord:</strong> ${discord_name}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`📧 Admin notified of new waitlist entry: ${discord_name}`);
  } catch (error) {
    logger.error(`❌ Failed to notify admin: ${logError(error)}`);
  }

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const channel = await guild.channels.fetch(
      process.env.DISCORD_ADMIN_CHAT_CHANNEL_ID
    );

    if (!channel?.isTextBased?.()) {
      logger.warn("⚠️ Admin channel not text-based or not found.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📥 New Waitlist Submission")
      .addFields(
        { name: "🆔 Submission ID", value: id?.toString() || "Unknown" },
        { name: "💬 Discord", value: discord_name || "Unknown" },
        { name: "📧 Email", value: email || "Unknown" }
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Admin Panel")
        .setStyle(ButtonStyle.Link)
        .setURL("https://create-rington.com/login-admin/")
    );

    await channel.send({ embeds: [embed], components: [row] });
    logger.info(
      `📢 Discord admin channel notified of waitlist: ${discord_name}`
    );
  } catch (error) {
    logger.error(`❌ Failed to send Discord notification: ${logError(error)}`);
  }
}
