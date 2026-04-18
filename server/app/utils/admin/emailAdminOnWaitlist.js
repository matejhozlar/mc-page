import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../../../logger.js";
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";
import config from "../../../config/index.js";
import { sendInviteById } from "./sendInvite.js";

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

const { LIME_GREEN } = config.uiColors;

/**
 * Notifies the admin via email and Discord about a new waitlist submission.
 *
 * @param {Object} submission - The waitlist submission details.
 * @param {number|string} submission.id - The unique waitlist submission ID.
 * @param {string} submission.email - The email address of the user.
 * @param {string} submission.discord_name - The Discord name of the user.
 * @param {import('discord.js').Client} client - The Discord.js client instance.
 * @returns {Promise<void>} - Resolves when all notifications are attempted.
 */
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
    logger.info(`Admin notified of new waitlist entry: ${discord_name}`);
  } catch (error) {
    logger.error("Failed to notify admin by email:", error);
  }

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const channel = await guild.channels.fetch(
      process.env.DISCORD_ADMIN_CHAT_CHANNEL_ID,
    );

    if (!channel?.isTextBased?.()) {
      logger.warn("Admin channel not text-based or not found.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📥 New Waitlist Submission")
      .addFields(
        { name: "🆔 Submission ID", value: id?.toString() || "Unknown" },
        { name: "💬 Discord", value: discord_name || "Unknown" },
        { name: "📧 Email", value: email || "Unknown" },
      )
      .setColor(LIME_GREEN)
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`waitlist:accept:${id}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`waitlist:decline:${id}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger),
    );

    const linkRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Admin Panel")
        .setStyle(ButtonStyle.Link)
        .setURL("https://createrington.com/login-admin/"),
    );

    await channel.send({ embeds: [embed], components: [actionRow, linkRow] });
    logger.info(`Discord admin channel notified of waitlist: ${discord_name}`);
  } catch (error) {
    logger.error("Failed to send Discord notification:", error);
  }
}

/**
 * Auto-sends an invite to the user and notifies admins via a Discord embed
 * without Accept/Decline buttons—only an Admin Panel link. The embed states
 * that the user was auto-invited.
 *
 * @param {Object} submission
 * @param {number|string} submission.id
 * @param {string} submission.email
 * @param {string} submission.discord_name
 * @param {import('discord.js').Client} client
 * @param {any} [db] - Optional DB handle if your sendInviteById signature requires it.
 * @returns {Promise<{ ok: boolean, msg?: string }>}
 */
export async function autoInviteAndNotify(
  { id, email, discord_name },
  client,
  db,
) {
  let inviteResult = { ok: false, msg: "Unknown error" };
  try {
    if (db) {
      inviteResult = await sendInviteById(db, id, process.env);
    } else {
      try {
        inviteResult = await sendInviteById(id, process.env);
      } catch {
        inviteResult = await sendInviteById(id);
      }
    }
  } catch (error) {
    logger.error("Auto-invite failed:", error);
    inviteResult = { ok: false, msg: error?.message || "Auto-invite error" };
  }

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const channel = await guild.channels.fetch(
      process.env.DISCORD_ADMIN_CHAT_CHANNEL_ID,
    );

    if (!channel?.isTextBased?.()) {
      logger.warn("Admin channel not text-based or not found.");
    } else {
      const success = !!inviteResult?.ok;
      const botMention =
        guild.members.me?.toString() || `<@${client.user?.id}>` || "bot";
      const embed = new EmbedBuilder()
        .setTitle("📥 New Waitlist Submission")
        .setColor(success ? LIME_GREEN : 0xff0000)
        .addFields(
          {
            name: "🆔 Submission ID",
            value: id?.toString() || "Unknown",
            inline: false,
          },
          {
            name: "💬 Discord",
            value: discord_name || "Unknown",
            inline: false,
          },
          { name: "📧 Email", value: email || "Unknown", inline: false },
        )
        .setTimestamp();

      const linkRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Open Admin Panel")
          .setStyle(ButtonStyle.Link)
          .setURL("https://createrington.com/login-admin/"),
      );

      await channel.send({
        content: success
          ? `✅ Accepted by ${botMention}`
          : "Auto-invite attempted — please review.",
        embeds: [embed],
        components: [linkRow],
      });

      logger.info(
        `Admin notified of auto-invite for ${discord_name} (success=${success})`,
      );
    }
  } catch (error) {
    logger.error("Failed to send Discord auto-invite notification:", error);
  }

  return inviteResult?.ok
    ? { ok: true, token: inviteResult.token }
    : { ok: false, msg: inviteResult?.msg || "Unknown error" };
}
