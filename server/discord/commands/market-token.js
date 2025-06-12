import {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    logger.info("Puppeteer launched.");
  } catch (error) {
    logger.error(`❌ Error launching Puppeteer: ${logError(error)}`);
    return null;
  }

  const page = await browser.newPage();
  const chartPageUrl = `https://create-rington.com/chart/${encodeURIComponent(
    symbol
  )}`;

  try {
    logger.info(`Navigating to ${chartPageUrl}...`);
    await page.goto(chartPageUrl, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    logger.info("Page loaded. Waiting for chart to render...");
    await page.waitForSelector(".chart-container", { timeout: 10000 });
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 5000))
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
    logger.error(`❌ Error during screenshot capture: ${logError(error)}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

export async function execute(interaction) {
  try {
    const symbol = interaction.options.getString("symbol").toUpperCase();

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
      .setColor(0x3498db)
      .setFooter({ text: "Market Token Chart" });

    await interaction.editReply({
      embeds: [embed],
      files: [chartImage],
    });

    logger.info(`✅ Chart for ${symbol} sent to Discord.`);
  } catch (error) {
    logger.error(`❌ Error executing market-token command: ${logError(error)}`);
    try {
      await interaction.editReply({
        content: `⚠️ Something went wrong. Try again later.`,
      });
    } catch {}
  }
}
