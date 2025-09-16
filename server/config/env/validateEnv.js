import dotenv from "dotenv";
import logger from "../../logger.js";

// required vars
import REQUIRED_VARS from "./vars/requiredVars.js";

dotenv.config();

/**
 * Validates that all required environment variables are set.
 *
 * Environment variables are defined in `REQUIRED_VARS` and must be loaded before calling this function.
 * Logs an error and exits the process if any required variable is missing.
 *
 * @function
 * @returns {void}
 */
export function validateEnv() {
  let hasError = false;
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      logger.error(`Missing required env variable: ${key}`);
      hasError = true;
    }
  }

  if (hasError) {
    logger.error("Environment validation failed. Exiting");
    process.exit(1);
  } else {
    logger.info("All required environment variables are set");
  }
}
