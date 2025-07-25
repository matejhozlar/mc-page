import express from "express";
import logger from "../logger.js";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACCESS_CODE = process.env.ASSET_DOWNLOAD_CODE;

export default function assetsRoutes() {
  const router = express.Router();

  // --- /api/download/assets?code=SECRET_CODE ---
  router.get("/download/assets", (req, res) => {
    const providedCode = req.query.code;

    if (!providedCode || providedCode !== ACCESS_CODE) {
      logger.warn("Unauthorized attempt to access assets.zip");
      return res.status(401).send("Unauthorized: Invalid or missing code");
    }

    const filePath = path.join(__dirname, "..", "download", "assets.zip");

    if (!existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    logger.info("Authorized download of assets.zip");
    res.download(filePath, "assets.zip", (error) => {
      if (error) {
        logger.error("Error sending assets.zip", error);
        res.status(500).send("Failed to send file");
      }
    });
  });

  return router;
}
