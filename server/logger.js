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

  monitorDateChange() {
    setInterval(() => {
      const newDate = this.getDateString();
      if (newDate !== this.currentDate) {
        this.logger.close();
        this.currentDate = newDate;
        this.logger = this.createLoggerForDate(this.currentDate);
      }
    }, 60 * 1000);
  }

  log(level, message) {
    this.logger.log({ level, message });
  }

  warn(message) {
    this.logger.warn(message);
  }

  info(message) {
    this.logger.info(message);
  }

  error(message) {
    this.logger.error(message);
  }
}

const loggerInstance = new DailyFolderLogger();
export default loggerInstance;
