import { describe, expect, test, mock } from 'bun:test';

/**
 * 임베딩 TS↔Rust IPC 계약 고정 테스트.
 *
 * Rust `src-tauri/src/models.rs`의 EmbeddingRequest/EmbeddingResponse는
 * `#[serde(rename_all = "camelCase")]`이므로 와이어 형식은 camelCase다:
 *   요청  { request: { runtimeId, modelId, input } }
 *   응답  { vector: number[] }
 *
 * 과거 서비스는 `{ text }`를 보내고 `{ embedding }`을 기대해 런타임에 항상
 * 실패했고(catch가 조용히 삼켜 의미 정렬이 영구 비활성), 이 회귀를
 * 페이로드 빌더/응답 파서의 출력 형상 어설션으로 고정한다.
 */

// bun이 @tauri-apps/api/core 실모듈(EJS 번들)을 로드하면 실패하므로,
// 기존 desktop 테스트 선례(settings-storage/byok-provider)처럼 mock으로 대체한다.
mock.module('@tauri-apps/api/core', () => ({ invoke: async () => null }));
mock.module('@tauri-apps/api/event', () => ({ listen: async () => () => {} }));

// 정적 import는 호이스팅돼 다른 테스트 파일과 함께 실행될 때 mock 등록 전에
// 실제 tauri 모듈 그래프를 로드할 수 있어, 선례와 같이 동적 import로 받는다.
async function loadContract() {
  return await import('./desktop-llm-service');
}

describe('run_embedding TS↔Rust 계약', () => {
  test('페이로드는 serde(camelCase) EmbeddingRequest와 정확히 일치한다', async () => {
    const { buildEmbeddingInvokePayload } = await loadContract();
    const payload = buildEmbeddingInvokePayload({
      text: 'hello world',
      modelId: 'embedding-model',
      runtimeId: 'managed-local',
    });

    // 역직렬화 성공의 필요충분 집합 — 여분 키 없음
    expect(Object.keys(payload.request).sort()).toEqual([
      'input',
      'modelId',
      'runtimeId',
    ]);
    expect(payload).toEqual({
      request: {
        runtimeId: 'managed-local',
        modelId: 'embedding-model',
        input: 'hello world',
      },
    });

    // 과거 결함 형상({ text })과 구별됨
    expect('text' in payload.request).toBe(false);
  });

  test('text만 있으면 기본 런타임/모델 id가 채워진다(Rust 쪽 필수 필드)', async () => {
    const { buildEmbeddingInvokePayload } = await loadContract();
    const payload = buildEmbeddingInvokePayload({ text: 'hi' });
    expect(payload.request.runtimeId.length > 0).toBe(true);
    expect(payload.request.modelId.length > 0).toBe(true);
    expect(payload.request.input).toBe('hi');
  });

  test('응답은 { vector }에서 파싱되며 legacy { embedding } 키는 거부된다', async () => {
    const { parseEmbeddingResponse } = await loadContract();
    const vector = [0.1, -0.2, 0.3];
    expect(parseEmbeddingResponse({ vector })).toEqual(vector);

    // 과거 TS 타입이 기대하던 잘못된 키 — undefined 입력 방어와 동일하게 처리
    expect(() => parseEmbeddingResponse({ embedding: vector } as never)).toThrow();
    expect(() => parseEmbeddingResponse(undefined)).toThrow();
  });
});
