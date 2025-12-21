/**
 * Simple error logging utility
 * In production, this could be integrated with services like Sentry, LogRocket, etc.
 */

interface ErrorLog {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: string;
  url?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;

  logError(error: Error | string, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' && error.stack ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    this.logs.push(errorLog);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog);
    }

    // In production, you could send to an error tracking service
    // Example: Sentry.captureException(error, { extra: context });
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();

