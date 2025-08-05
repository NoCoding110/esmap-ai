import type { LogEntry } from '../types';

export class Logger {
  private requestId: string;
  private env: string;

  constructor(requestId: string = crypto.randomUUID(), env: string = 'development') {
    this.requestId = requestId;
    this.env = env;
  }

  private log(level: LogEntry['level'], message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      metadata
    };

    console.log(JSON.stringify(entry));
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log('error', message, metadata);
  }

  getRequestId(): string {
    return this.requestId;
  }
}