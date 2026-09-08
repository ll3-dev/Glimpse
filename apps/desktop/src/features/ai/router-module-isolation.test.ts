import { describe, expect, test } from 'bun:test';
import * as realRouter from './router';
import { defaultChatRouterDeps } from './chat-generation';

/**
 * router 모듈 격리 회귀 가드(CI recovery 2026-09-06).
 *
 * chat-generation.test.ts가 예전에 mock.module('./router')로 라우터 모듈 자체를
 * 대체했다. bun의 모듈 mock은 프로세스 전역이라, 같은 bun test 프로세스에서
 * 뒤이어 실행되는 router.test.ts가 모크를 받아 적색이 되는 실행 순서 결합이
 * 생긴다. chat-generation은 이제 router를 deps로 주입받으므로 어떤 테스트도
 * './router'를 mock.module로 대체해선 안 된다.
 *
 * 이 파일은 그 계약을 강제한다: 라우터 모듈이 모크로 대체되면 실 라우터 전용
 * export(getProviderForFeature, generateMetadata)가 사라지고, chat-generation의
 * 기본 deps와의 참조 동일성도 깨진다.
 */
describe('router 모듈 격리 — 실행 순서 무관', () => {
  test("'./router'는 mock으로 대체되지 않은 실 모듈이다 — 실 전용 export 유지", () => {
    expect(typeof realRouter.getProviderForFeature).toBe('function');
    expect(typeof realRouter.generateMetadata).toBe('function');
    expect(typeof realRouter.generateChatResponse).toBe('function');
    expect(typeof realRouter.generateChatStreamResponse).toBe('function');
  });

  test('chat-generation 기본 router deps는 실 라우터 함수와 동일 참조다', () => {
    expect(defaultChatRouterDeps.generateChatResponse).toBe(
      realRouter.generateChatResponse,
    );
    expect(defaultChatRouterDeps.generateChatStreamResponse).toBe(
      realRouter.generateChatStreamResponse,
    );
  });
});
