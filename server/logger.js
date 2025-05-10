import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

const logDir = "logs";
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

function createSafeDailyRotateTransport(options) {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const datedDir = path.join(options.dirname || "", date);

  if (!fs.existsSync(datedDir)) {
    fs.mkdirSync(datedDir, { recursive: true });
  }

  return new DailyRotateFile({
    ...options,
    dirname: datedDir,
    filename: path.basename(options.filename),
  });
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    createSafeDailyRotateTransport({
      dirname: logDir,
      filename: "server-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxSize: "10m",
      maxFiles: "14d",
    }),
    createSafeDailyRotateTransport({
      dirname: logDir,
      filename: "errors-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
    }),
    new winston.transports.Console(),
  ],
  exceptionHandlers: [
    createSafeDailyRotateTransport({
      dirname: logDir,
      filename: "exceptions-%DATE%.log",
      datePattern: "YYYY-MM-DD",
    }),
  ],
});

export default logger;
