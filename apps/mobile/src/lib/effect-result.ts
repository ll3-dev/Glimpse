import { Cause, Effect, Exit, Option } from 'effect';

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'NOT_FOUND'
  | 'GENERATION_ERROR'
  | 'UNKNOWN_ERROR'
  | 'AI_PROVIDER_ERROR';

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

    if ('cause' in details && details.cause !== undefined) {
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
  details?: unknown
): AppError {
  return {
    _tag: code,
    code,
    message,
    details: normalizeErrorDetails(details),
  };
}

export function unknownError(
  message: string = 'Unexpected error occurred',
  details?: unknown
): AppError {
  return appError('UNKNOWN_ERROR', message, details);
}

export function isAppError(error: unknown): error is AppError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybe = error as Partial<AppError>;
  return (
    typeof maybe.code === 'string' &&
    typeof maybe.message === 'string' &&
    maybe.code.length > 0
  );
}

export function toAppError(
  error: unknown,
  fallbackCode: AppErrorCode = 'UNKNOWN_ERROR',
  fallbackMessage: string = 'Unexpected error occurred'
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
  result: T
): result is Extract<T, { success: false }> {
  return result.success === false;
}

export function isSuccess<T extends { success: boolean }>(
  result: T
): result is Extract<T, { success: true }> {
  return result.success === true;
}

export function tryPromise<T>(
  run: () => Promise<T>,
  onError: (error: unknown) => AppError
): Effect.Effect<T, AppError> {
  return Effect.tryPromise({
    try: run,
    catch: onError,
  });
}

export function trySync<T>(
  run: () => T,
  onError: (error: unknown) => AppError
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
    error: unknownError('Unexpected effect failure', Cause.pretty(cause)),
  };
}

export async function runEffectResult<T>(
  effect: Effect.Effect<T, AppError>
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
  effect: Effect.Effect<TSuccess, AppError>
): Promise<TSuccess | FailureResult> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  return causeToFailureResult(exit.cause);
}
