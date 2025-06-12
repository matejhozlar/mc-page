import puppeteer from "puppeteer";
import path from "path";

async function captureChartScreenshot() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const chartPageUrl = "http://localhost:3000/chart/MOO";

  await page.goto(chartPageUrl, {
    waitUntil: "networkidle0", // ensures network activity has stopped
    timeout: 60000,
  });

  // Use setTimeout for the 5-second delay
  await page.evaluate(
    () => new Promise((resolve) => setTimeout(resolve, 5000))
  );

  const chartDiv = await page.$(".chart-container");
  if (!chartDiv) {
    console.error("❌ Chart container not found.");
    await browser.close();
    return;
  }

  const screenshotPath = path.resolve(`MOO-chart.png`);
  await chartDiv.screenshot({ path: screenshotPath });

  console.log(`✅ Screenshot saved to: ${screenshotPath}`);
  await browser.close();
}

captureChartScreenshot().catch((err) => {
  console.error("❌ Error capturing screenshot:", err);
});
