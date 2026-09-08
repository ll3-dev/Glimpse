/**
 * HuggingFace GGUF 탐색 클라이언트 — 카탈로그에 없는 커뮤니티 GGUF를
 * 검색·선택해 다운로드하는 "GGUF 탐색기"용.
 *
 * 공개 HF API만 쓴다(인증 불필요). 다운로드 자체는 기존 ModelDownloader
 * (sha256·크기 검증, .part 이어받기)를 재사용한다.
 */

export interface GGUFRepoSearchResult {
  repoId: string;
  downloads: number;
  lastModified: string | null;
}

export interface GGUFFileEntry {
  filename: string;
  sizeBytes: number;
  /** 비전 프로젝터(mmproj) 파일 — 이미지 입력용. */
  isVisionProjector: boolean;
}

const HF_API_BASE = "https://huggingface.co/api";

export function buildSearchUrl(query: string, limit: number): string {
  const params = new URLSearchParams({
    search: `${query} gguf`,
    limit: String(limit),
    sort: "downloads",
    direction: "-1",
  });
  return `${HF_API_BASE}/models?${params.toString()}`;
}

export function buildTreeUrl(repoId: string): string {
  return `${HF_API_BASE}/models/${repoId}/tree/main`;
}

/** 검색 결과 파싱 — 파이프라인이 있는 원 모델 저장소 등 GGUF 저장소가 아닌 것은 호출부에서 걸러낸다. */
export function parseSearchResults(payload: unknown): GGUFRepoSearchResult[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((entry): entry is { id: string; downloads?: number; lastModified?: string } => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { id?: unknown }).id === "string"
      );
    })
    .map((entry) => ({
      repoId: entry.id,
      downloads: typeof entry.downloads === "number" ? entry.downloads : 0,
      lastModified: typeof entry.lastModified === "string" ? entry.lastModified : null,
    }));
}

export function parseTreeFiles(payload: unknown): GGUFFileEntry[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(
      (entry): entry is { path: string; size?: number } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { path?: unknown }).path === "string" &&
        String((entry as { path?: unknown }).path).toLowerCase().endsWith(".gguf"),
    )
    .map((entry) => ({
      filename: entry.path,
      sizeBytes: typeof entry.size === "number" ? entry.size : 0,
      isVisionProjector: entry.path.toLowerCase().includes("mmproj"),
    }))
    .sort((a, b) => {
      // 본체 모델을 먼저, 큰 순으로 — mmproj는 뒤로.
      if (a.isVisionProjector !== b.isVisionProjector) {
        return a.isVisionProjector ? 1 : -1;
      }
      return b.sizeBytes - a.sizeBytes;
    });
}

export async function searchGGUFRepos(
  query: string,
  options?: { fetchFn?: typeof fetch; limit?: number },
): Promise<GGUFRepoSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const fetchFn = options?.fetchFn ?? fetch;
  const response = await fetchFn(buildSearchUrl(trimmed, options?.limit ?? 12));
  if (!response.ok) {
    throw new Error(`HuggingFace 검색 실패 (${response.status})`);
  }
  return parseSearchResults(await response.json());
}

export async function listRepoGGUFFiles(
  repoId: string,
  options?: { fetchFn?: typeof fetch },
): Promise<GGUFFileEntry[]> {
  const fetchFn = options?.fetchFn ?? fetch;
  const response = await fetchFn(buildTreeUrl(repoId));
  if (!response.ok) {
    throw new Error(`파일 목록 조회 실패 (${response.status})`);
  }
  return parseTreeFiles(await response.json());
}

/** 커스텀 모델 id — 저장소/파일명에서 안전한 slug 생성. */
export function customModelId(repoId: string, filename: string): string {
  const slug = `${repoId}/${filename}`
    .toLowerCase()
    .replace(/\.gguf$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `custom.${slug}`;
}

/** 검색 결과 표시용 다운로드 수 — 1.2K / 3.4M 형식. */
export function formatDownloadCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/** 파일 표시용 크기 — MB/GB. */
export function formatBytes(sizeBytes: number): string {
  if (sizeBytes <= 0) return "";
  if (sizeBytes >= 1_000_000_000) return `${(sizeBytes / 1_000_000_000).toFixed(2)}GB`;
  return `${Math.round(sizeBytes / 1_000_000)}MB`;
}
