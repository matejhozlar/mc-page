import path from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../../logger";

type Thunk = () => void;

const isProduction = (): boolean => process.env.NODE_ENV === "production";

/**
 * Runs the given function only if NODE_ENV === 'production'.
 * Useful for wrapping cron jobs or conditional startup logic.
 */
export function runOnlyInProduction(fn: Thunk): void {
  if (!isProduction()) {
    const relPath = getCallerRelativePath();
    logger.info(`🛑 Skipped production-only code from: ${relPath}`);
    return;
  }
  fn();
}

/**
 * Runs the given function only if NODE_ENV !== 'production'.
 */
export function runOnlyInDevelopment(fn: Thunk): void {
  if (isProduction()) {
    const relPath = getCallerRelativePath();
    logger.info(`🛑 Skipped development-only code from: ${relPath}`);
    return;
  }
  fn();
}

/**
 * Use at the top of listeners or modules to skip them entirely in non-production.
 * Returns true if in production, false otherwise.
 */
export function exitIfNotProduction(): boolean {
  if (!isProduction()) {
    const relPath = getCallerRelativePath();
    logger.info(`🛑 Skipped production-only module from: ${relPath}`);
    return false;
  }
  return true;
}

/**
 * Retrieves the caller's file path relative to the project root (`../../..` from this file).
 * Strips file extension and handles file:// URLs + encoded characters.
 *
 * @returns Clean relative path, like 'server/jobs/cron/reminders'
 */
function getCallerRelativePath(): string {
  const stack = new Error().stack ?? "";
  const stackLines = stack.split("\n");

  const callerLine = stackLines[3] ?? "";

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

export default {
  runOnlyInProduction,
  runOnlyInDevelopment,
  exitIfNotProduction,
};
