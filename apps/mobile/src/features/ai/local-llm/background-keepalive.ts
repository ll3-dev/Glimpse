/**
 * 백그라운드 작업이 로컬 LLM을 사용하는 동안 지연 언로드 타이머를 보류한다.
 * 모듈 레벨 카운터 — 같은 JS 컨텍스트(메인)에서 백그라운딩 직후 시작된
 * 작업이 언로드 타이머에 끊기는 최악의 경우를 막는다.
 */
let keepAliveCount = 0;

export function acquireLocalLLMKeepAlive(): void {
  keepAliveCount += 1;
}

export function releaseLocalLLMKeepAlive(): void {
  keepAliveCount = Math.max(0, keepAliveCount - 1);
}

export function hasLocalLLMKeepAlive(): boolean {
  return keepAliveCount > 0;
}
