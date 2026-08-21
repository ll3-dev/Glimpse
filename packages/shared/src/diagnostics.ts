export type DiagnosticLevel = 'warning' | 'error' | 'fatal';

export interface DiagnosticEvent {
  level: DiagnosticLevel;
  message: string;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
  timestamp: number;
}

export interface DiagnosticReporter {
  capture(event: DiagnosticEvent): void | Promise<void>;
}

let reporter: DiagnosticReporter | null = null;

export function setDiagnosticReporter(nextReporter: DiagnosticReporter | null): void {
  reporter = nextReporter;
}

export function captureDiagnostic(
  level: DiagnosticLevel,
  message: string,
  error?: unknown,
): void {
  if (!reporter) {
    return;
  }

  const event: DiagnosticEvent = {
    level,
    message,
    ...(error instanceof Error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        }
      : {}),
    timestamp: Date.now(),
  };

  try {
    const result = reporter.capture(event);
    if (result && typeof result.catch === 'function') {
      void result.catch(() => undefined);
    }
  } catch {
    // Diagnostics must never turn a recoverable application error into a crash.
  }
}
