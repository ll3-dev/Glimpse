import { nanoid } from 'nanoid';

export const MAX_ID_COLLISION_RETRIES = 3;

export function generateId(): string {
  return nanoid();
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
    message.includes('.id') ||
    message.includes('(id') ||
    /\bid\b/.test(message);

  return hasConstraintMarker && targetsIdColumn;
}
