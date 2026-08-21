import { afterEach, describe, expect, mock, test } from 'bun:test';
import { captureDiagnostic, setDiagnosticReporter } from './diagnostics';

afterEach(() => {
  setDiagnosticReporter(null);
});

describe('diagnostic reporter adapter', () => {
  test('is opt-in and emits a bounded error contract', () => {
    const capture = mock((_event: unknown) => undefined);
    setDiagnosticReporter({ capture });

    captureDiagnostic('error', 'operation failed', new Error('boom'));

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0]?.[0]).toMatchObject({
      level: 'error',
      message: 'operation failed',
      errorName: 'Error',
      errorMessage: 'boom',
    });
    expect(capture.mock.calls[0]?.[0]).not.toHaveProperty('context');
  });

  test('never throws when a reporter fails', () => {
    setDiagnosticReporter({
      capture: () => {
        throw new Error('reporter unavailable');
      },
    });

    expect(() => captureDiagnostic('fatal', 'crash')).not.toThrow();
  });
});
