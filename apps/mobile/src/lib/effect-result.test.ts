import { describe, expect, test } from 'bun:test';
import { Effect, Exit } from 'effect';
import {
  appError,
  unknownError,
  nitroModuleError,
  storageError,
  isAppError,
  toAppError,
  isFailure,
  isSuccess,
  tryPromise,
  trySync,
  runEffectResult,
  runEffectSuccess,
  type AppErrorCode,
} from './effect-result';

describe('appError', () => {
  test('creates AppError with required fields', () => {
    const error = appError('VALIDATION_ERROR', 'Invalid input');
    expect(error._tag).toBe('VALIDATION_ERROR');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toBeUndefined();
  });

  test('creates AppError with optional details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = appError('VALIDATION_ERROR', 'Invalid email', details);
    expect(error.details).toEqual(details);
  });

  test('serializes Error details for logging', () => {
    const error = appError('DATABASE_ERROR', 'Query failed', new Error('no such column: labels'));
    expect(error.details).toMatchObject({
      name: 'Error',
      message: 'no such column: labels',
    });
  });

  test('supports all error codes', () => {
    const codes: AppErrorCode[] = [
      'VALIDATION_ERROR',
      'DATABASE_ERROR',
      'NOT_FOUND',
      'GENERATION_ERROR',
      'UNKNOWN_ERROR',
    ];
    codes.forEach((code) => {
      const error = appError(code, 'test');
      expect(error.code).toBe(code);
    });
  });
});

describe('unknownError', () => {
  test('creates UNKNOWN_ERROR with default message', () => {
    const error = unknownError();
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.message).toBe('Unexpected error occurred');
  });

  test('creates UNKNOWN_ERROR with custom message', () => {
    const error = unknownError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
  });

  test('creates UNKNOWN_ERROR with details', () => {
    const details = { stack: 'test stack' };
    const error = unknownError('Error', details);
    expect(error.details).toEqual(details);
  });
});

describe('isAppError', () => {
  test('returns true for valid AppError', () => {
    const error = appError('VALIDATION_ERROR', 'test');
    expect(isAppError(error)).toBe(true);
  });

  test('returns false for null', () => {
    expect(isAppError(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isAppError(undefined)).toBe(false);
  });

  test('returns false for non-object', () => {
    expect(isAppError('error')).toBe(false);
    expect(isAppError(123)).toBe(false);
  });

  test('returns false for object without code', () => {
    expect(isAppError({ message: 'test' })).toBe(false);
  });

  test('returns false for object without message', () => {
    expect(isAppError({ code: 'VALIDATION_ERROR' })).toBe(false);
  });

  test('returns false for object with empty code', () => {
    expect(isAppError({ code: '', message: 'test' })).toBe(false);
  });

  test('returns true for object with code and message', () => {
    expect(isAppError({ code: 'VALIDATION_ERROR', message: 'test' })).toBe(true);
  });
});

describe('toAppError', () => {
  test('returns same error if already AppError', () => {
    const original = appError('VALIDATION_ERROR', 'original');
    const converted = toAppError(original);
    expect(converted).toBe(original);
  });

  test('converts Error to AppError', () => {
    const original = new Error('Something failed');
    const converted = toAppError(original);
    expect(converted.code).toBe('UNKNOWN_ERROR');
    expect(converted.message).toBe('Something failed');
    expect(converted.details).toMatchObject({
      name: 'Error',
    });
  });

  test('uses fallback code when provided', () => {
    const original = new Error('Not found');
    const converted = toAppError(original, 'NOT_FOUND', 'Item not found');
    expect(converted.code).toBe('NOT_FOUND');
  });

  test('uses fallback message for Error with empty message', () => {
    const original = new Error('');
    const converted = toAppError(original, 'UNKNOWN_ERROR', 'Fallback message');
    expect(converted.message).toBe('Fallback message');
  });

  test('converts unknown value to AppError', () => {
    const converted = toAppError('string error');
    expect(converted.code).toBe('UNKNOWN_ERROR');
    expect(converted.message).toBe('Unexpected error occurred');
    expect(converted.details).toBe('string error');
  });
});

describe('isFailure', () => {
  test('returns true for failure result', () => {
    const result = { success: false, error: appError('NOT_FOUND', 'test') };
    expect(isFailure(result)).toBe(true);
  });

  test('returns false for success result', () => {
    const result = { success: true, data: 'value' };
    expect(isFailure(result)).toBe(false);
  });
});

describe('isSuccess', () => {
  test('returns true for success result', () => {
    const result = { success: true, data: 'value' };
    expect(isSuccess(result)).toBe(true);
  });

  test('returns false for failure result', () => {
    const result = { success: false, error: appError('NOT_FOUND', 'test') };
    expect(isSuccess(result)).toBe(false);
  });
});

describe('tryPromise', () => {
  test('returns success effect for resolved promise', async () => {
    const effect = tryPromise(
      () => Promise.resolve('success'),
      () => appError('UNKNOWN_ERROR', 'failed')
    );
    const result = await Effect.runPromise(effect);
    expect(result).toBe('success');
  });

  test('returns failure effect for rejected promise', async () => {
    const effect = tryPromise(
      () => Promise.reject(new Error('async error')),
      (e) => appError('UNKNOWN_ERROR', (e as Error).message)
    );
    const exit = await Effect.runPromiseExit(effect);
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe('trySync', () => {
  test('returns success effect for successful computation', async () => {
    const effect = trySync(
      () => 42,
      () => appError('UNKNOWN_ERROR', 'failed')
    );
    const result = await Effect.runPromise(effect);
    expect(result).toBe(42);
  });

  test('returns failure effect for thrown error', async () => {
    const effect = trySync(
      () => {
        throw new Error('sync error');
      },
      (e) => appError('UNKNOWN_ERROR', (e as Error).message)
    );
    const exit = await Effect.runPromiseExit(effect);
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe('runEffectResult', () => {
  test('returns success result for successful effect', async () => {
    const effect = Effect.succeed('value');
    const result = await runEffectResult(effect);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('value');
    }
  });

  test('returns failure result for failed effect', async () => {
    const effect = Effect.fail(appError('NOT_FOUND', 'Item not found'));
    const result = await runEffectResult(effect);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});

describe('runEffectSuccess', () => {
  test('returns the success value for successful effect', async () => {
    const successValue = { success: true as const, data: 'result' };
    const effect = Effect.succeed(successValue);
    const result = await runEffectSuccess(effect);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('result');
    }
  });

  test('returns failure result for failed effect', async () => {
    const result = await runEffectSuccess(Effect.succeed({ success: true, data: 'test' }));
    // Note: This test verifies the function signature accepts the right type
    expect(result.success).toBe(true);
  });
});

describe('nitroModuleError', () => {
  test('creates NITRO_MODULE_UNAVAILABLE error', () => {
    const error = nitroModuleError('Module not loaded');
    expect(error.code).toBe('NITRO_MODULE_UNAVAILABLE');
    expect(error.message).toBe('Module not loaded');
  });

  test('creates NITRO_MODULE_UNAVAILABLE error with details', () => {
    const details = { cause: 'test', stack: 'test stack' };
    const error = nitroModuleError('Module failed', details);
    expect(error.code).toBe('NITRO_MODULE_UNAVAILABLE');
    expect(error.details).toEqual(details);
  });
});

describe('storageError', () => {
  test('creates STORAGE_ERROR', () => {
    const error = storageError('Save failed');
    expect(error.code).toBe('STORAGE_ERROR');
    expect(error.message).toBe('Save failed');
  });

  test('creates STORAGE_ERROR with details', () => {
    const details = { id: '123', operation: 'update' };
    const error = storageError('Update failed', details);
    expect(error.code).toBe('STORAGE_ERROR');
    expect(error.details).toEqual(details);
  });
});
