import dotenv from "dotenv";
import logger from "../../logger";

import REQUIRED_VARS, { RequiredEnvVar } from "./vars/requiredVars";

dotenv.config({ quiet: true });

/**
 * Validates that all required environment variables are set.
 * Logs errors for any missing vars and exits the process with code 1 on failure.
 */
export function validateEnv(): void {
  const missing: RequiredEnvVar[] = REQUIRED_VARS.filter(
    (key) => !process.env[key] || process.env[key] === ""
  );

  if (missing.length > 0) {
    for (const key of missing) {
      logger.error("Missing required env variable:", key);
    }
    logger.error("Environment validation failed. Exiting");
    process.exit(1);
  } else {
    logger.info("All required environment variables are set");
  }
}

export default validateEnv;
