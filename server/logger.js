import winston from "winston";
import path from "path";
import fs from "fs";
import util from "util";

const logDir = "logs";

class DailyFolderLogger {
  constructor() {
    this.currentDate = this.getDateString();
    this.logger = this.createLoggerForDate(this.currentDate);
    this.monitorDateChange();
  }

  getDateString() {
    const now = new Date();
    return now.toLocaleDateString("sv-SE");
  }

  getLogPathForDate(date, filename) {
    const datedDir = path.join(logDir, date);
    if (!fs.existsSync(datedDir)) {
      fs.mkdirSync(datedDir, { recursive: true });
    }
    return path.join(datedDir, filename);
  }

  createLoggerForDate(date) {
    const baseFormat = winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf((info) => {
        const { timestamp, level, message } = info;
        const splat = info[Symbol.for("splat")] || [];

        const formatted = util.format(
          message,
          ...splat.map((arg) =>
            arg instanceof Error
              ? arg.stack || arg.message
              : typeof arg === "object"
              ? util.inspect(arg, { depth: null, breakLength: 120 })
              : arg
          )
        );

        return `[${timestamp}] [${level.toUpperCase()}] ${formatted}`;
      })
    );

    return winston.createLogger({
      level: "info",
      format: baseFormat,
      transports: [
        new winston.transports.File({
          filename: this.getLogPathForDate(date, "server.log"),
          level: "info",
        }),
        new winston.transports.File({
          filename: this.getLogPathForDate(date, "errors.log"),
          level: "error",
        }),
        new winston.transports.Console(),
      ],
      exceptionHandlers: [
        new winston.transports.File({
          filename: this.getLogPathForDate(date, "exceptions.log"),
        }),
      ],
    });
  }

  cleanOldLogFolders(daysToKeep = 7) {
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    fs.readdir(logDir, (error, folders) => {
      if (error) return console.error("Failed to read logDir:", error);

      folders.forEach((folder) => {
        const folderPath = path.join(logDir, folder);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(folder)) return;

        const folderTime = new Date(folder).getTime();
        if (!isNaN(folderTime) && folderTime < cutoff) {
          fs.rm(folderPath, { recursive: true, force: true }, (rmErr) => {
            if (rmErr) {
              console.log(`Failed to delete old log folder ${folder}:`, rmErr);
            } else {
              console.log(`Deleted old log folder: ${folder}`);
            }
          });
        }
      });
    });
  }

  monitorDateChange() {
    setInterval(() => {
      const newDate = this.getDateString();
      if (newDate !== this.currentDate) {
        this.logger.close();
        this.currentDate = newDate;
        this.logger = this.createLoggerForDate(this.currentDate);
        this.cleanOldLogFolders(7);
      }
    }, 60 * 1000);
  }

  error(...args) {
    this.logger.error(...args);
  }

  warn(...args) {
    this.logger.warn(...args);
  }

  info(...args) {
    this.logger.info(...args);
  }

  log(level, ...args) {
    this.logger.log(level, ...args);
  }
}

const loggerInstance = new DailyFolderLogger();
export default loggerInstance;
