/**
 * Web/test stub — the rustra JSI surface only exists on native platforms.
 * Returning false routes the core client to the existing fallback path.
 */

export async function bootstrapRustraEngine(): Promise<boolean> {
  return false;
}
