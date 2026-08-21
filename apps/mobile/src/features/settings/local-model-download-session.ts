import { storage, StorageKeys } from "@/src/lib/storage";

export interface PersistedModelDownloadSession {
  modelId: string;
  filename: string;
  sourceRoute: string | null;
  startedAt: number;
}

function isSession(value: unknown): value is PersistedModelDownloadSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<PersistedModelDownloadSession>;
  return (
    typeof session.modelId === "string" &&
    typeof session.filename === "string" &&
    (session.sourceRoute === null || typeof session.sourceRoute === "string") &&
    typeof session.startedAt === "number"
  );
}

export function getPersistedModelDownloadSession(): PersistedModelDownloadSession | null {
  const serialized = storage.getString(StorageKeys.LOCAL_MODEL_DOWNLOAD_SESSION);
  if (!serialized) return null;

  try {
    const value: unknown = JSON.parse(serialized);
    return isSession(value) ? value : null;
  } catch {
    return null;
  }
}

export function persistModelDownloadSession(
  session: PersistedModelDownloadSession,
): void {
  storage.set(StorageKeys.LOCAL_MODEL_DOWNLOAD_SESSION, JSON.stringify(session));
}

export function clearPersistedModelDownloadSession(): void {
  storage.remove(StorageKeys.LOCAL_MODEL_DOWNLOAD_SESSION);
}
