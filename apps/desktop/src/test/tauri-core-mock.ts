/**
 * bun mock.module 프로세스 전역 오염 대비용 완전 core mock.
 *
 * @tauri-apps/api/event 2.10.x는 core.js에서 transformCallback을 정적 import
 * 한다. invoke만 있는 부분 mock이 먼저 등록되면, 이후 테스트의 진짜 event.js
 * 로드가 "Export named 'transformCallback' not found"로 폭발한다(CI Linux에서
 * 재현). core를 mock하는 모든 테스트는 이 팩토리를 사용한다.
 */
export function tauriCoreMocks(invoke: (cmd: string, args?: unknown) => unknown) {
  return {
    invoke,
    transformCallback: (callback: unknown, once?: boolean) => {
      void once;
      void callback;
      return 0;
    },
    convertFileSrc: (filePath: string) => filePath,
    isTauri: () => false,
  };
}
