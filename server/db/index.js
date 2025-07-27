import pg from "pg";
import dotenv from "dotenv";
import logger from "../logger.js";

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
