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

const { BLUE } = config.uiColors;

async function sendAdminNotice({ subject, plain, html, embed, client }) {
  const mailOptions = {
    from: `"Createrington" <${process.env.EMAIL_ADDRESS}>`,
    to: process.env.NOTIFY_ADMIN_EMAIL,
    subject,
    text: plain,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Admin email sent: ${subject}`);
  } catch (error) {
    logger.error("Failed to send admin email:", error);
  }

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const channel = await guild.channels.fetch(
      process.env.DISCORD_ADMIN_CHAT_CHANNEL_ID
    );

    if (!channel?.isTextBased?.()) {
      logger.warn("Admin channel not text-based or not found.");
      return;
    }

    await channel.send(embed);
    logger.info(`Discord admin channel notified: ${subject}`);
  } catch (error) {
    logger.error("Failed to send Discord notification:", error);
  }
}

/**
 * Notify admins that a NEW company was submitted and awaits approval.
 * @param {{ id:number|string, name:string, founder_uuid:string, short_description?:string }} data
 * @param {import('discord.js').Client} client
 */
export async function notifyAdminPendingCompany(data, client) {
  const { id, name, founder_uuid, short_description } = data;

  const subject = `🏢 New Company Submission Pending Approval: ${name}`;
  const plain = [
    `A new company is awaiting approval:`,
    `ID: ${id}`,
    `Name: ${name}`,
    `Founder UUID: ${founder_uuid}`,
    short_description ? `Short Description: ${short_description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p><strong>New company submission pending approval</strong></p>
    <ul>
      <li><strong>ID:</strong> ${id}</li>
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>Founder UUID:</strong> ${founder_uuid}</li>
      ${
        short_description
          ? `<li><strong>Short Description:</strong> ${short_description}</li>`
          : ""
      }
    </ul>
  `;

  const embedBuilder = new EmbedBuilder()
    .setTitle("🏢 New Company Submission (Pending Approval)")
    .addFields(
      { name: "Company ID", value: String(id) },
      { name: "Name", value: name || "Unknown" },
      { name: "Founder UUID", value: founder_uuid || "Unknown" },
      ...(short_description
        ? [{ name: "Short Description", value: short_description }]
        : [])
    )
    .setColor(BLUE)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Open Admin Panel")
      .setStyle(ButtonStyle.Link)
      .setURL("https://create-rington.com/login-admin/")
  );

  const embed = { embeds: [embedBuilder], components: [row] };

  await sendAdminNotice({ subject, plain, html, embed, client });
}

/**
 * Notify admins that a COMPANY EDIT request was submitted and awaits approval.
 * @param {{ edit_id:number|string, company_id:number|string, editor_uuid:string, name?:string, short_description?:string }} data
 * @param {import('discord.js').Client} client
 */
export async function notifyAdminCompanyEdit(data, client) {
  const { edit_id, company_id, editor_uuid, name, short_description } = data;

  const subject = `✏️ Company Edit Pending Review: Company ${company_id}`;
  const plain = [
    `A company edit is awaiting review:`,
    `Edit ID: ${edit_id}`,
    `Company ID: ${company_id}`,
    name ? `Proposed Name: ${name}` : null,
    `Editor UUID: ${editor_uuid}`,
    short_description ? `Short Description: ${short_description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p><strong>Company edit pending review</strong></p>
    <ul>
      <li><strong>Edit ID:</strong> ${edit_id}</li>
      <li><strong>Company ID:</strong> ${company_id}</li>
      ${name ? `<li><strong>Proposed Name:</strong> ${name}</li>` : ""}
      <li><strong>Editor UUID:</strong> ${editor_uuid}</li>
      ${
        short_description
          ? `<li><strong>Short Description:</strong> ${short_description}</li>`
          : ""
      }
    </ul>
  `;

  const embedBuilder = new EmbedBuilder()
    .setTitle("📝Company Edit Request (Pending Review)")
    .addFields(
      { name: "Edit ID", value: String(edit_id) },
      { name: "Company ID", value: String(company_id) },
      ...(name ? [{ name: "Proposed Name", value: name }] : []),
      { name: "Editor UUID", value: editor_uuid || "Unknown" },
      ...(short_description
        ? [{ name: "Short Description", value: short_description }]
        : [])
    )
    .setColor(BLUE)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Open Admin Panel")
      .setStyle(ButtonStyle.Link)
      .setURL("https://create-rington.com/login-admin/")
  );

  const embed = { embeds: [embedBuilder], components: [row] };

  await sendAdminNotice({ subject, plain, html, embed, client });
}

/**
 * Notify admins that a NEW shop was submitted and awaits approval.
 * @param {{
 *   id: number|string,
 *   name: string,
 *   company_id: number|string,
 *   company_name?: string,
 *   founder_uuid: string,
 *   short_description?: string
 * }} data
 * @param {import('discord.js').Client} client
 */
export async function notifyAdminPendingShop(data, client) {
  const {
    id,
    name,
    company_id,
    company_name,
    founder_uuid,
    short_description,
  } = data;

  const subject = `🛒 New Shop Submission Pending Approval: ${name}`;
  const plain = [
    `A new shop is awaiting approval:`,
    `Shop ID: ${id}`,
    `Shop Name: ${name}`,
    `Company ID: ${company_id}`,
    company_name ? `Company Name: ${company_name}` : null,
    `Founder UUID: ${founder_uuid}`,
    short_description ? `Short Description: ${short_description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p><strong>New shop submission pending approval</strong></p>
    <ul>
      <li><strong>Shop ID:</strong> ${id}</li>
      <li><strong>Shop Name:</strong> ${escapeHtml(name)}</li>
      <li><strong>Company ID:</strong> ${company_id}</li>
      ${
        company_name
          ? `<li><strong>Company Name:</strong> ${escapeHtml(
              company_name
            )}</li>`
          : ""
      }
      <li><strong>Founder UUID:</strong> ${founder_uuid}</li>
      ${
        short_description
          ? `<li><strong>Short Description:</strong> ${escapeHtml(
              short_description
            )}</li>`
          : ""
      }
    </ul>
  `;

  const embedBuilder = new EmbedBuilder()
    .setTitle("🛒 New Shop Submission (Pending Approval)")
    .addFields(
      { name: "Shop ID", value: String(id) },
      { name: "Shop Name", value: name || "Unknown" },
      { name: "Company ID", value: String(company_id) },
      ...(company_name ? [{ name: "Company Name", value: company_name }] : []),
      { name: "Founder UUID", value: founder_uuid || "Unknown" },
      ...(short_description
        ? [{ name: "Short Description", value: short_description }]
        : [])
    )
    .setColor(BLUE)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Open Admin Panel")
      .setStyle(ButtonStyle.Link)
      .setURL("https://create-rington.com/login-admin/")
  );

  const embed = { embeds: [embedBuilder], components: [row] };

  await sendAdminNotice({ subject, plain, html, embed, client });
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Notify admins that a NEW shop edit was submitted and awaits approval.
 * @param {{
 *   id: number|string,
 *   name: string,
 *   company_id: number|string,
 *   company_name?: string,
 *   editor_uuid: string,
 *   short_description?: string
 * }} data
 * @param {import('discord.js').Client} client
 */
export async function notifyAdminShopEdit(data, client) {
  const { edit_id, shop_id, company_id, editor_uuid, name, short_description } =
    data;

  const subject = `✏️ Shop Edit Pending Review: Shop ${shop_id}`;
  const plain = [
    `A shop edit is awaiting review:`,
    `Edit ID: ${edit_id}`,
    `Shop ID: ${shop_id}`,
    `Company ID: ${company_id}`,
    name ? `Proposed Name: ${name}` : null,
    `Editor UUID: ${editor_uuid}`,
    short_description ? `Short Description: ${short_description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p><strong>Shop edit pending review</strong></p>
    <ul>
      <li><strong>Edit ID:</strong> ${edit_id}</li>
      <li><strong>Shop ID:</strong> ${shop_id}</li>
      <li><strong>Company ID:</strong> ${company_id}</li>
      ${
        name
          ? `<li><strong>Proposed Name:</strong> ${escapeHtml(name)}</li>`
          : ""
      }
      <li><strong>Editor UUID:</strong> ${editor_uuid}</li>
      ${
        short_description
          ? `<li><strong>Short Description:</strong> ${escapeHtml(
              short_description
            )}</li>`
          : ""
      }
    </ul>
  `;

  const embedBuilder = new EmbedBuilder()
    .setTitle("Shop Edit Request (Pending Review)")
    .addFields(
      { name: "Edit ID", value: String(edit_id) },
      { name: "Shop ID", value: String(shop_id) },
      { name: "Company ID", value: String(company_id) },
      ...(name ? [{ name: "Proposed Name", value: name }] : []),
      { name: "Editor UUID", value: editor_uuid || "Unknown" },
      ...(short_description
        ? [{ name: "Short Description", value: short_description }]
        : [])
    )
    .setColor(BLUE)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Open Admin Panel")
      .setStyle(ButtonStyle.Link)
      .setURL("https://create-rington.com/login-admin/")
  );

  const embed = { embeds: [embedBuilder], components: [row] };
  await sendAdminNotice({ subject, plain, html, embed, client });
}
