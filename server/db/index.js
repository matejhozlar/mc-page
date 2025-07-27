import pg from "pg";
import dotenv from "dotenv";
import logger from "../logger.js";

/**
 * PostgreSQL database pool instance using environment variables.
 *
 * Environment Variables Used:
 * @env {string} DB_USER - The PostgreSQL username
 * @env {string} DB_HOST - The PostgreSQL host (e.g. localhost or remote)
 * @env {string} DB_DATABASE - The name of the database
 * @env {string} DB_PASSWORD - The database user's password
 * @env {string|number} DB_PORT - The port PostgreSQL is running on
 *
 * Connection Options:
 * - idleTimeoutMillis: 30000 (30 seconds)
 * - connectionTimeoutMillis: 10000 (10 seconds)
 *
 * @type {import('pg').Pool}
 */

dotenv.config();

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

try {
  await db.query("SELECT 1");
  logger.info("Connected to PostgreSQL database");
} catch (error) {
  logger.error(`❌ Failed to connect to DB: ${error}`);
  process.exit(1);
}

export default db;
