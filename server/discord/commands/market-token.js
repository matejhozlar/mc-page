import {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
import logger from "../../logger.js";

dotenv.config();

const COOLDOWN_MS = 10 * 60 * 1000;
const userCooldowns = new Map();

export const data = new SlashCommandBuilder()
  .setName("market-token")
  .setDescription("Generate a market token chart screenshot")
  .addStringOption((option) =>
    option
      .setName("symbol")
      .setDescription("Enter the token symbol (e.g., MOO, BTC, ETH)")
      .setRequired(true)
  );

async function captureChartScreenshot(symbol) {
  let browser;
  try {
    logger.info("Launching Puppeteer...");
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser", // Path to installed Chromium
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--ignore-certificate-errors", // trust any cert
      ],
    });

    logger.info("Puppeteer launched.");
  } catch (error) {
    logger.error(`❌ Error launching Puppeteer: ${error}`);
    return null;
  }

  const page = await browser.newPage();
  const chartPageUrl = `https://create-rington.com/chart/${encodeURIComponent(
    symbol
  )}`;

  try {
    logger.info(`Navigating to ${chartPageUrl}...`);
    await page.goto(chartPageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    logger.info("Page loaded. Waiting for chart to render...");
    page.on("requestfailed", (request) => {
      logger.error(`Request failed: ${request.url()}`);
    });
    await page.waitForSelector(".chart-container", { timeout: 10000 });
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 2000))
    );

    const chartDiv = await page.$(".chart-container");
    if (!chartDiv) {
      logger.error("❌ Chart container not found.");
      return null;
    }

    logger.info("Capturing screenshot to buffer...");
    const screenshotBuffer = await chartDiv.screenshot({ type: "png" });

    logger.info("✅ Screenshot captured.");
    return screenshotBuffer;
  } catch (error) {
    logger.error(`❌ Error during screenshot capture: ${error}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

export async function execute(interaction, db) {
  try {
    const symbol = interaction.options.getString("symbol").toUpperCase();

    const { rows } = await db.query(
      `SELECT price_per_unit FROM crypto_tokens WHERE LOWER(symbol) = LOWER($1) LIMIT 1`,
      [symbol]
    );

    const tokenInfo = rows[0];
    const isCrashed = tokenInfo && Number(tokenInfo.price_per_unit) === 0;
    const embedColor = isCrashed ? 0xff4d4f : 0x3498db;

    await interaction.deferReply();

    const screenshotBuffer = await captureChartScreenshot(symbol);

    if (!screenshotBuffer) {
      return await interaction.editReply({
        content: `❌ Failed to generate chart for symbol: **${symbol}**`,
      });
    }

    const chartImage = new AttachmentBuilder(screenshotBuffer, {
      name: `chart_${symbol}.png`,
    });

    const embed = new EmbedBuilder()
      .setTitle(`📊 Market Token Chart — ${symbol}`)
      .setDescription(`Here is the generated chart for **${symbol}**.`)
      .setImage(`attachment://chart_${symbol}.png`)
      .setColor(embedColor)
      .setFooter({ text: "Createrington Market" });

    await interaction.editReply({
      embeds: [embed],
      files: [chartImage],
    });

    logger.info(`✅ Chart for ${symbol} sent to Discord.`);
  } catch (error) {
    logger.error(`❌ Error executing market-token command: ${error}`);
    try {
      await interaction.editReply({
        content: `⚠️ Something went wrong. Try again later.`,
      });
    } catch {}
  }
}
