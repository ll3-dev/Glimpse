import { describe, expect, mock, test } from 'bun:test';
import { tauriCoreMocks } from './tauri-core-mock';

/**
 * 계약: 이 팩토리로 core를 mock한 뒤에도 진짜 event.js가 로드 가능해야 한다.
 * 부분 mock(invoke만 등록)이 돌아오면 event.js의 정적
 * `import { transformCallback } from './core.js'`가 폭발하므로, 이 테스트가
 * CI/Linux 워커 순서에서 먼저 잡아낸다.
 */
describe('tauriCoreMocks 완전성 계약', () => {
  test('완전 mock 등록 후 진짜 event.js가 로드된다', async () => {
    mock.module('@tauri-apps/api/core', () => tauriCoreMocks(async () => null));
    const event = await import('@tauri-apps/api/event');
    expect(typeof event.listen).toBe('function');
  });
});
