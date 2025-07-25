import winston from "winston";
import path from "path";
import fs from "fs";

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
    return winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
      ),
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
      if (err) return console.error("Failed to read logDir:", error);

      folders.forEach((folder) => {
        const folderPath = path.join(logDir, folder);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(folder)) return;

        const folderTime = new Date(folder).getTime();
        if (!isNaN(folderTime) && folderTime < cutoff) {
          fs.rm(folderPath, { recursive: true, force: true }, (rmErr) => {
            if (rmErr) {
              console.log(`Failed to delete old log folder ${folder}:`, rmErr);
            } else {
              console.log(`Deteted old log folder: ${folder}`);
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

  formatMessage(input) {
    if (input instanceof Error) {
      return input.stack || input.message;
    }
    if (typeof input === "object") {
      try {
        return JSON.stringify(input);
      } catch {
        return String(input);
      }
    }
    return String(input);
  }

  error(message) {
    this.logger.error(this.formatMessage(message));
  }

  warn(message) {
    this.logger.warn(this.formatMessage(message));
  }

  info(message) {
    this.logger.info(this.formatMessage(message));
  }

  log(level, message) {
    this.logger.log({ level, message: this.formatMessage(message) });
  }
}

const loggerInstance = new DailyFolderLogger();
export default loggerInstance;
