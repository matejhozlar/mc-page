import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";
import { runOnlyInDevelopment } from "../utils/production/env-guard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reactBuildPath = path.join(__dirname, "..", "..", "..", "client", "dist");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

/**
 * Initializes and configures an Express application.
 *
 * Middleware included:
 * - JSON body parsing
 * - CORS (enabled only in development)
 * - URL-encoded body parsing
 * - Cookie parsing
 * - Static file serving for the React frontend
 */
export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use("/api", limiter);
  app.use(express.json());
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(express.static(reactBuildPath));

  runOnlyInDevelopment(() => {
    app.use(cors({ origin: true, credentials: true }));
  });

  return app;
}
