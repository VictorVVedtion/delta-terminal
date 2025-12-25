/**
 * 日志工具
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LoggerOptions {
  level?: LogLevel;
  service?: string;
  pretty?: boolean;
}

export class Logger {
  private level: LogLevel;
  private service: string;
  private pretty: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.service = options.service ?? 'delta-terminal';
    this.pretty = options.pretty ?? process.env.NODE_ENV !== 'production';
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.service,
      message,
      ...meta,
    };

    if (this.pretty) {
      console.log(`[${timestamp}] [${level.toUpperCase()}] [${this.service}] ${message}`, meta);
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (this.level === LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, meta);
  }
}

export const createLogger = (options?: LoggerOptions) => new Logger(options);
