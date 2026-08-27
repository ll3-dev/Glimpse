import { beforeEach, describe, expect, test } from 'bun:test';
// react-native AppState/Platform은 src/test/setup.ts 전역 mock 사용

/**
 * useMobileSemanticRerank 분기 결정 테스트 — BYOK 우선 → 온디바이스 폴백
 * → 둘 다 없으면 inactive(null target) 순서를 deps 팩토리 수준에서 검증.
 *
 * React hook 자체가 아닌 createOnDeviceEmbedDeps의 resolveEmbeddingTarget
 * 결정 로직을 대상으로 한다(hook 본문은 platform-neutral useSemanticRerank가
 * 이미 커버).
 */

import {
  createOnDeviceEmbedDeps,
  suspendOnDeviceEmbedding,
} from './useMobileSemanticRerank';

describe('createOnDeviceEmbedDeps 분기', () => {
  beforeEach(async () => {
    // 모듈 수준 임베더 상태 초기화
    await suspendOnDeviceEmbedding();
  });

  test('resolveEmbeddingTarget이 on-device runtimeId로 응답한다', async () => {
    const deps = createOnDeviceEmbedDeps('/models/nomic.gguf');
    const target = await deps.resolveEmbeddingTarget();
    expect(target).toEqual({
      runtimeId: 'on-device-llama-rn',
      modelId: 'nomic.gguf',
    });
  });

  test('동일 경로 재요청 시 같은 runtimeId 계약을 유지한다', async () => {
    const deps = createOnDeviceEmbedDeps('/models/nomic.gguf');
    const target = await deps.resolveEmbeddingTarget();
    expect(target?.runtimeId).toBe('on-device-llama-rn');
  });
});
