import { describe, expect, test } from "bun:test";
import {
  buildSearchUrl,
  buildTreeUrl,
  customModelId,
  formatBytes,
  formatDownloadCount,
  listRepoGGUFFiles,
  parseSearchResults,
  parseTreeFiles,
  searchGGUFRepos,
} from "./huggingface-search";

/**
 * HuggingFace 탐색 클라이언트 — URL 규칙과 응답 파싱 계약.
 * fetch는 주입해 네트워크 없이 검증한다.
 */

describe("URL 규칙", () => {
  test("검색 URL에 gguf 키워드와 정렬이 들어간다", () => {
    const url = buildSearchUrl("gemma 3n", 10);
    expect(url).toContain("https://huggingface.co/api/models?");
    expect(url).toContain("search=gemma");
    expect(url).toContain("gguf");
    expect(url).toContain("limit=10");
    expect(url).toContain("sort=downloads");
  });

  test("트리 URL은 저장소 id를 그대로 사용한다", () => {
    expect(buildTreeUrl("unsloth/gemma-3n-E4B-it-GGUF")).toBe(
      "https://huggingface.co/api/models/unsloth/gemma-3n-E4B-it-GGUF/tree/main",
    );
  });
});

describe("파싱", () => {
  test("검색 결과에서 id·다운로드·수정일을 뽑는다", () => {
    const parsed = parseSearchResults([
      { id: "a/b-GGUF", downloads: 1234, lastModified: "2026-08-24T00:00:00Z" },
      { id: "c/d" },
      { nope: true },
      "junk",
    ]);
    expect(parsed).toEqual([
      { repoId: "a/b-GGUF", downloads: 1234, lastModified: "2026-08-24T00:00:00Z" },
      { repoId: "c/d", downloads: 0, lastModified: null },
    ]);
  });

  test("트리 파싱은 .gguf만 남기고 본체를 mmproj보다 앞에 둔다", () => {
    const parsed = parseTreeFiles([
      { path: "mmproj-model-Q8_0.gguf", size: 583 },
      { path: "model-Q8_0.gguf", size: 246 },
      { path: "model-Q4_K_M.gguf", size: 153 },
      { path: "README.md", size: 10 },
      { path: "config.json" },
    ]);
    expect(parsed.map((f) => f.filename)).toEqual([
      "model-Q8_0.gguf",
      "model-Q4_K_M.gguf",
      "mmproj-model-Q8_0.gguf",
    ]);
    expect(parsed[2].isVisionProjector).toBe(true);
    expect(parsed[0].isVisionProjector).toBe(false);
  });
});

describe("네트워크 계약", () => {
  test("searchGGUFRepos — 비정상 응답은 throw", async () => {
    const fetchFn = (async () => new Response("no", { status: 500 })) as typeof fetch;
    await expect(searchGGUFRepos("gemma", { fetchFn })).rejects.toThrow("검색 실패");
  });

  test("listRepoGGUFFiles — 빈 쿼리는 요청 없이 빈 배열", async () => {
    await expect(searchGGUFRepos("   ")).resolves.toEqual([]);
  });
});

describe("표시 헬퍼", () => {
  test("customModelId는 저장소/파일명에서 slug를 만든다", () => {
    expect(customModelId("unsloth/gemma-3n-E4B-it-GGUF", "gemma-3n-E4B-it-Q4_K_M.gguf")).toBe(
      "custom.unsloth-gemma-3n-e4b-it-gguf-gemma-3n-e4b-it-q4-k-m",
    );
  });

  test("다운로드 수·크기 표시", () => {
    expect(formatDownloadCount(1_618_479)).toBe("1.6M");
    expect(formatDownloadCount(594)).toBe("594");
    expect(formatBytes(4_539_054_208)).toBe("4.54GB");
    expect(formatBytes(153_406_304)).toBe("153MB");
    expect(formatBytes(0)).toBe("");
  });
});
