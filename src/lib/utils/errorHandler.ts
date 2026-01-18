import type { ScooterConfig } from '$lib/types';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  config?: Partial<ScooterConfig>;
  timestamp: number;
}

interface ErrorLog {
  error: unknown;
  context: ErrorContext;
  stack?: string;
}

class ErrorHandler {
  private errors: ErrorLog[] = [];
  private maxErrors = 50;

  handleError(error: unknown, context: ErrorContext): void {
    const errorLog: ErrorLog = {
      error,
      context: {
        ...context,
        timestamp: Date.now()
      },
      stack: error instanceof Error ? error.stack : undefined
    };
    
    this.errors.push(errorLog);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    
    // Console output with structured format
    console.error(`[${context.component}] ${context.action}`, error);
    
    // In production, send to error tracking service
    if (import.meta.env.PROD) {
      this.sendToErrorTracking(errorLog);
    }
  }

  private sendToErrorTracking(errorLog: ErrorLog): void {
    // Implement integration with Sentry, LogRocket, etc.
    // For now, store in localStorage for debugging
    try {
      const existing = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existing.push(errorLog);
      localStorage.setItem('errorLogs', JSON.stringify(existing.slice(-100)));
    } catch {
      // Silent failure
    }
  }

  getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }
}

export const errorHandler = new ErrorHandler();

export function handleError(error: unknown, context: string): void {
  console.error(`[${context}]`, error);
}

export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    handleError(error, 'localStorage.getItem');
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    handleError(error, 'localStorage.setItem');
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    handleError(error, 'localStorage.removeItem');
  }
}
