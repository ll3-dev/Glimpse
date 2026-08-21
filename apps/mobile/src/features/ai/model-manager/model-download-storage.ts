import RNBlobUtil from "react-native-blob-util";
import { Platform } from "react-native";

const PART_SUFFIX = ".part";
const SIZE_TOLERANCE_BYTES = 1024;
const PARTIAL_FILE_QUIET_MS = 5000;
const rejectedPartialVersions = new Map<string, number>();

function getModelsDirectory(): string {
  return Platform.OS === "android"
    ? `${RNBlobUtil.fs.dirs.DownloadDir}/GlimpseModels/`
    : `${RNBlobUtil.fs.dirs.DocumentDir}/models/`;
}

export type RecoveredModelDownload =
  | { status: "completed"; path: string }
  | { status: "pending"; written: number; total: number }
  | { status: "missing" };

function matchesExpectedSize(actual: number, expected?: number): boolean {
  return !expected || expected <= 0 || Math.abs(actual - expected) <= SIZE_TOLERANCE_BYTES;
}

async function ensureDirectory(path: string): Promise<void> {
  if (!(await RNBlobUtil.fs.isDir(path))) {
    await RNBlobUtil.fs.mkdir(path);
  }
}

export async function ensureModelDownloadDirectories(): Promise<void> {
  await ensureDirectory(getModelsDirectory());
}

export function getModelPath(filename: string): string {
  return `${getModelsDirectory()}${filename}`;
}

export function getPartialModelPath(filename: string): string {
  return `${getModelsDirectory()}${filename}${PART_SUFFIX}`;
}

export async function isModelDownloaded(
  filename: string,
  expectedSize?: number,
  expectedSha256?: string,
): Promise<boolean> {
  const path = getModelPath(filename);
  try {
    if (!(await RNBlobUtil.fs.exists(path))) {
      return false;
    }

    const stat = await RNBlobUtil.fs.stat(path);
    if (!matchesExpectedSize(stat.size, expectedSize)) {
      await RNBlobUtil.fs.unlink(path).catch(() => undefined);
      return false;
    }
    if (expectedSha256) {
      const actualSha256 = await RNBlobUtil.fs.hash(path, "sha256");
      if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
        await RNBlobUtil.fs.unlink(path).catch(() => undefined);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function getModelSize(filename: string): Promise<number | null> {
  const path = getModelPath(filename);
  try {
    if (!(await RNBlobUtil.fs.exists(path))) {
      return null;
    }
    return (await RNBlobUtil.fs.stat(path)).size;
  } catch {
    return null;
  }
}

export async function deleteModel(filename: string): Promise<void> {
  const paths = [getModelPath(filename), getPartialModelPath(filename)];
  try {
    await Promise.all(
      paths.map(async (path) => {
        if (await RNBlobUtil.fs.exists(path)) {
          await RNBlobUtil.fs.unlink(path);
        }
      }),
    );
  } catch (error) {
    throw new Error(
      `모델 삭제 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    );
  }
}

export async function movePartialModelToFinal(
  filename: string,
  expectedSize?: number,
  expectedSha256?: string,
): Promise<string> {
  const partialPath = getPartialModelPath(filename);
  const finalPath = getModelPath(filename);
  const stat = await RNBlobUtil.fs.stat(partialPath);
  if (!matchesExpectedSize(stat.size, expectedSize)) {
    await RNBlobUtil.fs.unlink(partialPath).catch(() => undefined);
    throw new Error(
      `다운로드 검증 실패: 예상 ${expectedSize ?? "unknown"}바이트, 실제 ${stat.size}바이트`,
    );
  }
  if (!expectedSha256) {
    await RNBlobUtil.fs.unlink(partialPath).catch(() => undefined);
    throw new Error("다운로드 검증 실패: SHA-256 메타데이터가 없습니다.");
  }

  const actualSha256 = await RNBlobUtil.fs.hash(partialPath, "sha256");
  if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
    await RNBlobUtil.fs.unlink(partialPath).catch(() => undefined);
    throw new Error("다운로드 검증 실패: SHA-256이 일치하지 않습니다.");
  }

  const moved = await RNBlobUtil.fs
    .mv(partialPath, finalPath)
    .then(() => true)
    .catch(() => false);
  if (!moved) {
    throw new Error("다운로드 완료 처리 실패: 최종 파일 이동 불가");
  }
  return finalPath;
}

export async function recoverModelDownload(
  filename: string,
  expectedSize?: number,
  expectedSha256?: string,
): Promise<RecoveredModelDownload> {
  await ensureModelDownloadDirectories();
  if (await isModelDownloaded(filename, expectedSize, expectedSha256)) {
    return { status: "completed", path: getModelPath(filename) };
  }

  const partialPath = getPartialModelPath(filename);
  if (!(await RNBlobUtil.fs.exists(partialPath))) {
    return { status: "missing" };
  }

  const stat = await RNBlobUtil.fs.stat(partialPath);
  if (
    matchesExpectedSize(stat.size, expectedSize) &&
    expectedSha256 &&
    Date.now() - stat.lastModified >= PARTIAL_FILE_QUIET_MS &&
    rejectedPartialVersions.get(partialPath) !== stat.lastModified
  ) {
    const actualSha256 = await RNBlobUtil.fs.hash(partialPath, "sha256");
    if (actualSha256.toLowerCase() === expectedSha256.toLowerCase()) {
      rejectedPartialVersions.delete(partialPath);
      return {
        status: "completed",
        path: await movePartialModelToFinal(filename, expectedSize, expectedSha256),
      };
    }
    rejectedPartialVersions.set(partialPath, stat.lastModified);
  }

  return {
    status: "pending",
    written: stat.size,
    total: expectedSize ?? 0,
  };
}

export async function listDownloadedModels(): Promise<string[]> {
  await ensureModelDownloadDirectories();
  try {
    return (await RNBlobUtil.fs.ls(getModelsDirectory())).filter((file) =>
      file.endsWith(".gguf"),
    );
  } catch {
    return [];
  }
}
