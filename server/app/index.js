import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { runOnlyInDevelopment } from "../utils/production/onlyInProduction.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactBuildPath = path.join(__dirname, "..", "..", "client", "dist");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

/**
 * Initializes and configures an Express application.
 *
 * Middleware included:
 * - JSON body parsing
 * - CORS with credentials support
 * - URL-encoded body parsing
 * - Cookie parsing
 * - Static file serving for the React frontend
 *
 * @returns {import('express').Express} Configured Express application instance
 */
export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use("/api", limiter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(express.static(reactBuildPath));

  runOnlyInDevelopment(() => {
    app.use(cors({ origin: true, credentials: true }));
  });

  return app;
}
