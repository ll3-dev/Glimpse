import { describe, expect, test, mock } from 'bun:test';

/**
 * 다운로드 무결성 회귀 테스트 — .part 패턴과 크기 검증.
 *
 * 과거 결함: (1) 다운로드 중 강제 종료로 남은 부분 .gguf가 완성본으로
 * 취급되어 모델 로드 실패 유발, (2) fetch 에러 경로가 아니면 부분 파일
 * 정리가 없음. RNBlobUtil 을 인메모리 FS mock으로 대체해 검증한다.
 */

type FileEntry = { size: number };

const files = new Map<string, FileEntry>();

const statMock = mock(async (path: string) => ({ size: files.get(path)?.size ?? 0 }));
const existsMock = mock(async (path: string) => files.has(path));
const unlinkMock = mock(async (path: string) => {
  files.delete(path);
});
const mvMock = mock(async (from: string, to: string) => {
  const entry = files.get(from);
  if (!entry) return false;
  files.set(to, entry);
  files.delete(from);
  return true;
});

let fetchImpl: (url: string) => Promise<{ ok: boolean; status: number; body: unknown }>;

mock.module('react-native-blob-util', () => ({
  default: {
    config: (opts: { path: string }) => ({
      fetch: () => {
        // 실제 RNBlobUtil task 는 thenable + progress 체인 —
        // 에러는 catch 경로, 성공은 then 경로로 흘러야 한다.
        const promise = (async () => {
          const res = await fetchImpl(opts.path);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          // 다운로드 "완료" — body 크기만큼 기록했다 친다
          files.set(opts.path, { size: res.body as number });
          return { path: () => opts.path };
        })();

        const task = {
          progress: (_opts: unknown, _cb: unknown) => task,
          then: promise.then.bind(promise),
          catch: promise.catch.bind(promise),
          finally: promise.finally.bind(promise),
        };
        return task;
      },
    }),
    fs: {
      dirs: { DocumentDir: '/mock/documents', CacheDir: '/mock/cache' },
      exists: existsMock,
      isDir: async () => true,
      mkdir: async () => true,
      stat: statMock,
      unlink: unlinkMock,
      mv: mvMock,
    },
  },
}));

const HuggingFaceAPI_mock = {
  getModelDownloadUrl: (repo: string, filename: string) => `https://hf.co/${repo}/${filename}`,
  getFileSize: mock(async () => null as number | null),
};

mock.module('@/src/features/ai/model-manager/huggingface-api', () => ({
  HuggingFaceAPI: HuggingFaceAPI_mock,
}));

const { ModelDownloader } = await import('./model-downloader');

const MODEL = {
  id: 'test-model',
  name: 'Test Model',
  repo: 'test/repo',
  filename: 'model.gguf',
  family: 'qwen-chatml' as const,
};

const FINAL_PATH = '/mock/documents/models/model.gguf';
const PART_PATH = `${FINAL_PATH}.part`;

describe('ModelDownloader 무결성', () => {
  test('완전한 파일은 다운로드됨으로 판정한다', async () => {
    files.clear();
    files.set(FINAL_PATH, { size: 1000 });

    expect(await ModelDownloader.isModelDownloaded('model.gguf', 1000)).toBe(true);
  });

  test('크기가 다른(부분) 파일은 삭제 후 false를 반환한다', async () => {
    files.clear();
    // 오차 허용치(±1KB)를 벗어나는 부분 파일이어야 한다
    files.set(FINAL_PATH, { size: 400 }); // 5000바이트 중 400

    expect(await ModelDownloader.isModelDownloaded('model.gguf', 5000)).toBe(false);
    expect(files.has(FINAL_PATH)).toBe(false); // 오염 파일 자동 삭제
  });

  test('.part 에 기록하고 검증 통과 시 최종 경로로 이동한다', async () => {
    files.clear();
    HuggingFaceAPI_mock.getFileSize.mockImplementation(async () => 5000);
    fetchImpl = async () => ({ ok: true, status: 200, body: 5000 });

    const path = await new ModelDownloader().downloadModel(MODEL);

    expect(path).toBe(FINAL_PATH);
    expect(files.has(FINAL_PATH)).toBe(true);
    expect(files.get(FINAL_PATH)?.size).toBe(5000);
    expect(files.has(PART_PATH)).toBe(false); // tmp 정리
  });

  test('크기 검증 실패 시 에러를 내고 최종 경로를 오염시키지 않는다', async () => {
    files.clear();
    HuggingFaceAPI_mock.getFileSize.mockImplementation(async () => 5000);
    fetchImpl = async () => ({ ok: true, status: 200, body: 500 }); // 부분 다운로드

    await expect(new ModelDownloader().downloadModel(MODEL)).rejects.toThrow('검증 실패');
    expect(files.has(FINAL_PATH)).toBe(false);
    expect(files.has(PART_PATH)).toBe(false);
  });

  test('fetch 실패 시 .part 를 정리한다', async () => {
    files.clear();
    HuggingFaceAPI_mock.getFileSize.mockImplementation(async () => 5000);
    fetchImpl = async () => ({ ok: false, status: 503, body: 0 });

    await expect(new ModelDownloader().downloadModel(MODEL)).rejects.toThrow();
    expect(files.has(PART_PATH)).toBe(false);
    expect(files.has(FINAL_PATH)).toBe(false);
  });
});
