import path from "path";
import { fileURLToPath } from "url";
import logger from "../../logger.js";

/**
 * Runs the given function only if NODE_ENV === 'production'.
 * Useful for wrapping cron jobs or conditional startup logic.
 *
 * @param {Function} fn - Code block to run in production.
 */
export function runOnlyInProduction(fn) {
  if (process.env.NODE_ENV !== "production") {
    const relPath = getCallerRelativePath();
    logger.info(`🛑 Skipped production-only code from: ${relPath}`);
    return;
  }
  fn();
}

/**
 * Runs the given function only if NODE_ENV !== 'production'.
 *
 * @param {Function} fn - Code block to run in development.
 */
export function runOnlyInDevelopment(fn) {
  if (process.env.NODE_ENV === "production") {
    const relPath = getCallerRelativePath();
    logger.info(`🛑 Skipped development-only code from: ${relPath}`);
    return;
  }
  fn();
}

/**
 * Used at the top of listeners or modules to skip them entirely in non-production.
 * Returns early if not in production.
 *
 * @returns {boolean} - True if in production, otherwise false.
 */
export function exitIfNotProduction() {
  if (process.env.NODE_ENV !== "production") {
    const relPath = getCallerRelativePath();
    logger.info(`🛑 Skipped production-only module from: ${relPath}`);
    return false;
  }
  return true;
}

/**
 * Retrieves the caller's file path relative to the project root (`../../` from this file).
 * Strips file extension and handles file:// URLs + encoded characters.
 *
 * @returns {string} - Clean relative path, like 'server/jobs/cron/reminders'
 */
function getCallerRelativePath() {
  const stack = new Error().stack;
  const stackLines = stack?.split("\n") || [];
  const callerLine = stackLines[3] || "";

  const match =
    callerLine.match(/\((.*):\d+:\d+\)$/) ||
    callerLine.match(/at (.*):\d+:\d+$/);

  let fullPath = match?.[1];
  if (!fullPath) return "unknown";

  if (fullPath.startsWith("file://")) {
    fullPath = fileURLToPath(fullPath);
  } else {
    fullPath = decodeURIComponent(fullPath);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, "../../..");

  const relativePath = path.relative(projectRoot, fullPath);
  const parsed = path.parse(relativePath);

  return path.join(parsed.dir, parsed.name).replaceAll("\\", "/");
}
