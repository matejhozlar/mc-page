import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

const logDir = "logs";
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

function createSafeDailyRotateTransport(options) {
  const transport = new DailyRotateFile(options);

  // Patch the log function to ensure the folder exists before each log
  const originalLog = transport.log.bind(transport);

  transport.log = (info, next) => {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const folderPath = path.join(options.dirname || "", date);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Replace %DATE% in filename
    transport.filename = path.join(
      date,
      path.basename(options.filename.replace("%DATE%", date))
    );

    return originalLog(info, next);
  };

  return transport;
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
      filename: "%DATE%/server.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxSize: "10m",
      maxFiles: "14d",
    }),
    createSafeDailyRotateTransport({
      dirname: logDir,
      filename: "%DATE%/errors.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
    }),
    new winston.transports.Console(),
  ],
  exceptionHandlers: [
    createSafeDailyRotateTransport({
      dirname: logDir,
      filename: "%DATE%/exceptions.log",
      datePattern: "YYYY-MM-DD",
    }),
  ],
});

export default logger;
