type LogContext = Record<string, unknown>;

type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void;

type GlobalErrorUtils = {
  getGlobalHandler?: () => GlobalErrorHandler | undefined;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

function toErrorStack(error: unknown): string {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  return new Error('Trace capture').stack ?? 'no stack available';
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  },

  error: (message: string, error?: unknown, context?: LogContext) => {
    const stack = toErrorStack(error);
    console.error(message, {
      error: formatError(error),
      stack,
      ...context,
    });
  },
};

let isGlobalErrorTraceInstalled = false;

export function installGlobalErrorTraceLogger() {
  if (isGlobalErrorTraceInstalled) {
    return;
  }
  isGlobalErrorTraceInstalled = true;

  const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) {
    return;
  }

  const previousHandler = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error, isFatal) => {
    logger.error('Unhandled JavaScript error', error, { isFatal: Boolean(isFatal) });
    previousHandler?.(error, isFatal);
  });
}
