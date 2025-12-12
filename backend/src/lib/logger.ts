/**
 * Centralized logging utility
 * Provides structured logging with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }
    // In production, only log warn and error
    return level === 'warn' || level === 'error';
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
       
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
       
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
       
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext: LogContext = {
        ...context,
        ...(error instanceof Error
          ? {
              error: error.message,
              stack: error.stack
            }
          : { error: String(error) })
      };
       
      console.error(this.formatMessage('error', message, errorContext));
    }
  }
}

// Export singleton instance
export const logger = new Logger();

