// apps/mobile/src/features/core/specs/core/errors.ts
/**
 * Normalized error shape for JS-visible bridge errors.
 * Matches the architecture document's error boundary design.
 */
export interface CoreBridgeError {
  code:
    | 'INVALID_INPUT'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'DATABASE'
    | 'TIMEOUT'
    | 'CANCELLED'
    | 'INTERNAL';
  message: string;
  retryable: boolean;
  details?: Record<string, string | number | boolean | null>;
}

/**
 * Maps Rust Error enum to bridge error code.
 */
export function mapRustErrorToCode(rustError: string): CoreBridgeError['code'] {
  if (rustError.includes('InvalidInput')) return 'INVALID_INPUT';
  if (rustError.includes('NotFound')) return 'NOT_FOUND';
  if (rustError.includes('Conflict')) return 'CONFLICT';
  if (rustError.includes('Database')) return 'DATABASE';
  if (rustError.includes('Timeout')) return 'TIMEOUT';
  return 'INTERNAL';
}
