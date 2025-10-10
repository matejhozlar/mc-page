import winston from "winston";
import path from "node:path";
import fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { format as utilFormat, inspect } from "node:util";

const DEFAULT_LOG_DIR = "logs";

type LogLevel =
  | "error"
  | "warn"
  | "info"
  | "http"
  | "verbose"
  | "debug"
  | "silly";

export class DailyFolderLogger {
  private currentDate: string;
  private logger: winston.Logger;
  private interval: NodeJS.Timeout | null = null;

  constructor(private readonly logDir: string = DEFAULT_LOG_DIR) {
    this.currentDate = this.getDateString();
    this.logger = this.createLoggerForDate(this.currentDate);
    this.monitorDateChange();
  }

  private getDateString(): string {
    return new Date().toLocaleDateString("sv-SE");
  }

  private getLogPathForDate(date: string, filename: string): string {
    const datedDir = path.join(this.logDir, date);
    if (!fs.existsSync(datedDir)) {
      fs.mkdirSync(datedDir, { recursive: true });
    }
    return path.join(datedDir, filename);
  }

  private createLoggerForDate(date: string): winston.Logger {
    return winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf((info) => {
          const { timestamp, level, message, stack, ...rest } = info as any;
          const lvl = String(level).toUpperCase();
          const msg = stack ? String(stack) : String(message);
          const restKeys = Object.keys(rest);
          const extras =
            restKeys.length > 0
              ? " " + inspect(rest, { depth: null, breakLength: 120 })
              : "";
          return `[${timestamp}] [${lvl}] ${msg}${extras}`;
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

  async cleanOldLogFolders(daysToKeep = 7): Promise<void> {
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    try {
      const entries = await fsPromises.readdir(this.logDir, {
        withFileTypes: true,
      });
      await Promise.all(
        entries
          .filter((d) => d.isDirectory())
          .map(async (d) => {
            const folder = d.name;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(folder)) return;
            const folderTime = new Date(folder).getTime();
            if (!Number.isNaN(folderTime) && folderTime < cutoff) {
              const folderPath = path.join(this.logDir, folder);
              try {
                await fsPromises.rm(folderPath, {
                  recursive: true,
                  force: true,
                });
                console.log(`Deleted old log folder: ${folder}`);
              } catch (rmErr) {
                console.error(
                  `Failed to delete old log folder ${folder}:`,
                  rmErr
                );
              }
            }
          })
      );
    } catch (err) {
      console.error("Failed to read logDir:", err);
    }
  }

  private monitorDateChange(): void {
    this.interval = setInterval(async () => {
      const newDate = this.getDateString();
      if (newDate !== this.currentDate) {
        this.logger.close();
        this.currentDate = newDate;
        this.logger = this.createLoggerForDate(this.currentDate);
        void this.cleanOldLogFolders(7);
      }
    }, 60 * 1000);
  }

  private serialize(arg: unknown): string {
    if (arg instanceof Error) return arg.stack ?? arg.message;
    if (typeof arg === "string") return arg;
    if (
      typeof arg === "number" ||
      typeof arg === "boolean" ||
      arg === null ||
      arg === undefined
    ) {
      return String(arg);
    }
    try {
      return JSON.stringify(arg);
    } catch {
      return inspect(arg, { depth: null, breakLength: 120 });
    }
  }

  private formatArgs(args: unknown[]): string {
    if (args.length === 0) return "";
    const [first, ...rest] = args;
    if (typeof first === "string") {
      try {
        return utilFormat(first as string, ...rest);
      } catch {
        return [
          this.serialize(first),
          ...rest.map((a) => this.serialize(a)),
        ].join(" ");
      }
    }
    return args.map((a) => this.serialize(a)).join(" ");
  }

  error(...args: unknown[]): this {
    this.logger.error(this.formatArgs(args));
    return this;
  }

  warn(...args: unknown[]): this {
    this.logger.warn(this.formatArgs(args));
    return this;
  }

  info(...args: unknown[]): this {
    this.logger.info(this.formatArgs(args));
    return this;
  }

  debug(...args: unknown[]): this {
    this.logger.debug(this.formatArgs(args));
    return this;
  }

  verbose(...args: unknown[]): this {
    this.logger.verbose(this.formatArgs(args));
    return this;
  }

  silly(...args: unknown[]): this {
    this.logger.silly(this.formatArgs(args));
    return this;
  }

  log(level: LogLevel, ...args: unknown[]): this {
    this.logger.log({ level, message: this.formatArgs(args) });
    return this;
  }

  dispose(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.logger.close();
  }
}

const loggerInstance = new DailyFolderLogger();
export default loggerInstance;
