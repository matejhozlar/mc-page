import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactBuildPath = path.join(__dirname, "..", "..", "client", "dist");

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

  app.use(express.json());
  app.use(cors({ origin: true, credentials: true }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(express.static(reactBuildPath));

  return app;
}
