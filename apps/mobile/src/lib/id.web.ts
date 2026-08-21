export const MAX_ID_COLLISION_RETRIES = 3;

export function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // Static rendering can run without Web Crypto. This fallback is only used
  // for client-side identifiers in that constrained environment.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function isIdCollisionError(error: unknown): boolean {
  const message = String(error ?? '').toLowerCase();
  const hasConstraintMarker =
    message.includes('unique') ||
    message.includes('duplicate') ||
    message.includes('constraint') ||
    message.includes('primary key') ||
    message.includes('sqlite_constraint');
  const targetsIdColumn =
    message.includes('.id') || message.includes('(id') || /\bid\b/.test(message);

  return hasConstraintMarker && targetsIdColumn;
}
