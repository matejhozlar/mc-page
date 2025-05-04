import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

const logDir = "logs";
const today = new Date().toISOString().split("T")[0];
const datedDir = path.join(logDir, today);

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
if (!fs.existsSync(datedDir)) fs.mkdirSync(datedDir);

const rconLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new DailyRotateFile({
      dirname: datedDir,
      filename: "rcon-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxSize: "10m",
      maxFiles: "14d",
    }),
  ],
});

export default rconLogger;
