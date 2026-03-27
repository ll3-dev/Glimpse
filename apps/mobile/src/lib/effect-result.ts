import { Cause, Context, Effect, Exit, Layer, Option } from "effect";

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "NOT_FOUND"
  | "GENERATION_ERROR"
  | "UNKNOWN_ERROR"
  | "AI_PROVIDER_ERROR"
  | "NITRO_MODULE_UNAVAILABLE"
  | "STORAGE_ERROR";

export interface AppError {
  readonly _tag: AppErrorCode | string;
  readonly code: AppErrorCode | string;
  readonly message: string;
  readonly details?: unknown;
}

function normalizeErrorDetails(details: unknown): unknown {
  if (details instanceof Error) {
    const normalized: Record<string, unknown> = {
      name: details.name,
      message: details.message,
    };

    if (details.stack) {
      normalized.stack = details.stack;
    }

    if ("cause" in details && details.cause !== undefined) {
      normalized.cause = normalizeErrorDetails(details.cause);
    }

    return normalized;
  }

  return details;
}

export interface FailureResult {
  success: false;
  error: AppError;
}

export interface SuccessResult<T> {
  success: true;
  data: T;
}

export type Result<T> = SuccessResult<T> | FailureResult;

export function appError(
  code: AppErrorCode,
  message: string,
  details?: unknown,
): AppError {
  return {
    _tag: code,
    code,
    message,
    details: normalizeErrorDetails(details),
  };
}

export function unknownError(
  message: string = "Unexpected error occurred",
  details?: unknown,
): AppError {
  return appError("UNKNOWN_ERROR", message, details);
}

export function nitroModuleError(message: string, details?: unknown): AppError {
  return appError("NITRO_MODULE_UNAVAILABLE", message, details);
}

export function storageError(message: string, details?: unknown): AppError {
  return appError("STORAGE_ERROR", message, details);
}

export function isAppError(error: unknown): error is AppError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as Partial<AppError>;
  return (
    typeof maybe.code === "string" &&
    typeof maybe.message === "string" &&
    maybe.code.length > 0
  );
}

export function toAppError(
  error: unknown,
  fallbackCode: AppErrorCode = "UNKNOWN_ERROR",
  fallbackMessage: string = "Unexpected error occurred",
): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return appError(fallbackCode, error.message || fallbackMessage, {
      name: error.name,
      stack: error.stack,
    });
  }

  return appError(fallbackCode, fallbackMessage, error);
}

export function isFailure<T extends { success: boolean }>(
  result: T,
): result is Extract<T, { success: false }> {
  return result.success === false;
}

export function isSuccess<T extends { success: boolean }>(
  result: T,
): result is Extract<T, { success: true }> {
  return result.success === true;
}

export function tryPromise<T>(
  run: () => Promise<T>,
  onError: (error: unknown) => AppError,
): Effect.Effect<T, AppError> {
  return Effect.tryPromise({
    try: run,
    catch: onError,
  });
}

export function trySync<T>(
  run: () => T,
  onError: (error: unknown) => AppError,
): Effect.Effect<T, AppError> {
  return Effect.try({
    try: run,
    catch: onError,
  });
}

function causeToFailureResult(cause: Cause.Cause<AppError>): FailureResult {
  const typedFailure = Cause.failureOption(cause);
  if (Option.isSome(typedFailure)) {
    return {
      success: false,
      error: typedFailure.value,
    };
  }

  return {
    success: false,
    error: unknownError("Unexpected effect failure", Cause.pretty(cause)),
  };
}

export async function runEffectResult<T>(
  effect: Effect.Effect<T, AppError>,
): Promise<Result<T>> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) {
    return {
      success: true,
      data: exit.value,
    };
  }

  return causeToFailureResult(exit.cause);
}

export async function runEffectSuccess<TSuccess extends { success: true }>(
  effect: Effect.Effect<TSuccess, AppError>,
): Promise<TSuccess | FailureResult> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  return causeToFailureResult(exit.cause);
}

// ============================================================================
// Context & Layer for Dependency Injection
// ============================================================================

/**
 * Database service interface for DI
 */
export interface Database {
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  execute: (sql: string, params?: unknown[]) => Promise<void>;
}

/**
 * AI Service interface for DI
 */
export interface AiService {
  generateMetadata: (input: {
    content: string;
    title?: string;
    type?: string;
  }) => Promise<{ summary: string; tags: string[] }>;
  isAvailable: () => Promise<boolean>;
}

/**
 * Logger service interface for DI
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// Context Tags for services
export const DatabaseTag = Context.GenericTag<Database>("@services/Database");
export const AiServiceTag = Context.GenericTag<AiService>(
  "@services/AiService",
);
export const LoggerTag = Context.GenericTag<Logger>("@services/Logger");

// Placeholder Layers (실제 구현은 런타임에 제공)
export const DatabaseLive = Layer.succeed(DatabaseTag, {
  query: async () => {
    throw new Error("Database layer not provided");
  },
  execute: async () => {
    throw new Error("Database layer not provided");
  },
});

export const AiServiceLive = Layer.succeed(AiServiceTag, {
  generateMetadata: async () => {
    throw new Error("AiService layer not provided");
  },
  isAvailable: async () => false,
});

export const LoggerLive = Layer.succeed(LoggerTag, {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});

/**
 * Run an Effect with a Layer for dependency injection.
 * Converts the result to Result<T> for compatibility.
 */
export async function runEffectWithLayer<R, E extends AppError, A>(
  effect: Effect.Effect<A, E, R>,
  layer: Layer.Layer<R, never, never>,
): Promise<Result<A>> {
  const provided = Effect.provide(effect, layer);
  return runEffectResult(provided);
}

/**
 * Run an Effect with multiple Layers combined.
 */
export async function runEffectWithLayers<R1, R2, E extends AppError, A>(
  effect: Effect.Effect<A, E, R1 | R2>,
  layers: Layer.Layer<R1 | R2, never, never>,
): Promise<Result<A>> {
  const provided = Effect.provide(effect, layers);
  return runEffectResult(provided);
}
