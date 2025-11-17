import morgan from 'morgan';
import { Request, Response } from 'express';

// Custom log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Logger class for structured logging
export class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaString}`;
  }

  error(message: string, meta?: any): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, meta));
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }
}

// Default logger instance
export const logger = new Logger();

// Morgan middleware for HTTP request logging
export const httpLogger = morgan((tokens: any, req: Request, res: Response) => {
  const status = tokens.status(req, res);
  const method = tokens.method(req, res);
  const url = tokens.url(req, res);
  const responseTime = tokens['response-time'](req, res);
  const userAgent = req.get('User-Agent');
  const ip = req.ip || req.connection.remoteAddress;

  const logData = {
    method,
    url,
    status: parseInt(status || '0'),
    responseTime: parseFloat(responseTime || '0'),
    ip,
    userAgent,
    userId: (req as any).user?.id,
  };

  // Log based on status code
  if (parseInt(status || '0') >= 400) {
    logger.error('HTTP Request Error', logData);
  } else {
    logger.info('HTTP Request', logData);
  }

  return `${method} ${url} ${status} ${responseTime}ms`;
});

// Create context-specific loggers
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};