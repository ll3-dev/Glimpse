import { describe, expect, test } from 'bun:test';
// react-native AppState는 src/test/setup.ts 전역 mock 사용
import { createOnDeviceEmbedder } from './on-device-embedder';
import { makeInitLlama } from './on-device-embedder.test-helper';

/**
 * 온디바이스 임베더 계약:
 * - 동시 embedBatch 호출이 겹치지 않는다(직렬 큐)
 * - 로드/embed 실패 시 reject — 상위(useSemanticRerank)가 키워드 폴백
 * - dispose 후 호출은 빈 배열 반환(폴백 흐름 유지), suspend 후에는 lazy 재초기화
 */

describe('createOnDeviceEmbedder', () => {
  test('배치 요청을 순서 보존하며 단일 컨텍스트에서 처리한다', async () => {
    const fake = makeInitLlama();
    const embedder = createOnDeviceEmbedder(
      { modelPath: '/models/nomic.gguf', modelId: 'nomic' },
      { initLlama: fake.initLlama },
    );

    const vectors = await embedder.embedBatch([
      { input: 'a' },
      { input: 'b' },
      { input: 'c' },
    ]);

    expect(vectors).toHaveLength(3);
    expect(vectors.every((v) => v.vector.length === 3)).toBe(true);
    expect(fake.contexts).toHaveLength(1); // 컨텍스트 재사용
    expect(fake.maxConcurrentEmbed).toBe(1); // 동시 embed 없음
  });

  test('동시 embedBatch 호출이 겹치지 않게 직렬화한다', async () => {
    const fake = makeInitLlama();
    const embedder = createOnDeviceEmbedder(
      { modelPath: '/models/nomic.gguf', modelId: 'nomic' },
      { initLlama: fake.initLlama },
    );

    const [first, second] = await Promise.all([
      embedder.embedBatch([{ input: 'a' }, { input: 'b' }]),
      embedder.embedBatch([{ input: 'c' }]),
    ]);

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(1);
    expect(fake.maxConcurrentEmbed).toBe(1);
  });

  test('모델 로드 실패 시 reject — 키워드 폴백 트리거', async () => {
    const fake = makeInitLlama({ failLoad: true });
    const embedder = createOnDeviceEmbedder(
      { modelPath: '/missing.gguf', modelId: 'm' },
      { initLlama: fake.initLlama },
    );

    await expect(embedder.embedBatch([{ input: 'x' }])).rejects.toThrow(
      /모델 로드 실패/,
    );
  });

  test('suspend 후 재호출 시 lazy 재초기화하고 이전 컨텍스트를 release한다', async () => {
    const fake = makeInitLlama();
    const embedder = createOnDeviceEmbedder(
      { modelPath: '/models/nomic.gguf', modelId: 'nomic' },
      { initLlama: fake.initLlama },
    );

    await embedder.embedBatch([{ input: 'a' }]);
    await embedder.suspend();
    expect(fake.contexts[0]?.released).toBe(true);

    await embedder.embedBatch([{ input: 'b' }]);
    expect(fake.contexts).toHaveLength(2); // 새 컨텍스트
  });

  test('dispose 후 호출은 빈 배열(호출부 폴백 유지)', async () => {
    const fake = makeInitLlama();
    const embedder = createOnDeviceEmbedder(
      { modelPath: '/models/nomic.gguf', modelId: 'nomic' },
      { initLlama: fake.initLlama },
    );

    await embedder.embedBatch([{ input: 'a' }]);
    await embedder.dispose();

    const result = await embedder.embedBatch([{ input: 'b' }]);
    expect(result).toEqual([]);
  });
});
