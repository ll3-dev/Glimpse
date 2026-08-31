import { describe, expect, test, mock, beforeEach, afterEach, afterAll } from 'bun:test';
import { Window } from 'happy-dom';

/**
 * 백그라운드 언로드 레이스 검증.
 *
 * 과거 결함: 백그라운드 진입 30초 후 언로드 타이머가 무조건 실행되어,
 * 같은 JS 컨텍스트에서 백그라운딩 직후 시작된 라벨링 작업이 중간에 끊겼다.
 * keep-alive가 활성인 동안엔 언로드를 보류하고, 메모리 경고는 즉시 언로드한다.
 *
 * renderHook에는 document/navigator 같은 DOM 전역이 필요하다.
 * GlobalRegistrator는 프로세스 전역 싱글턴이라 같은 실행에 포함된
 * 다른 테스트 파일의 등록을 깨뜨리므로, Window를 직접 만들어
 * 필요한 전역만 옮기고 종료 때 복구한다.
 */

const win = new Window();
const globalScope = globalThis as unknown as Record<string, unknown>;

const originalDocument = globalScope.document;
const originalWindow = globalScope.window;
const originalNavigator = globalScope.navigator;

globalScope.document = win.document;
globalScope.window = win;
globalScope.navigator = win.navigator;

afterAll(() => {
  if (originalDocument === undefined) delete globalScope.document;
  else globalScope.document = originalDocument;
  if (originalWindow === undefined) delete globalScope.window;
  else globalScope.window = originalWindow;
  if (originalNavigator === undefined) delete globalScope.navigator;
  else globalScope.navigator = originalNavigator;
});

type ChangeListener = (state: string) => void;

const stateListeners: ChangeListener[] = [];
const memoryListeners: ChangeListener[] = [];

mock.module('react-native', () => ({
  AppState: {
    addEventListener: (_type: string, listener: ChangeListener) => {
      if (_type === 'memoryWarning') {
        memoryListeners.push(listener);
      } else {
        stateListeners.push(listener);
      }
      return { remove: () => {} };
    },
  },
  // mock.module은 프로세스 전역으로 새어나가므로 setup.ts의 나머지
  // export도 그대로 유지해 다른 테스트 파일을 깨뜨리지 않는다.
  Platform: { OS: 'ios', Version: '17.0', select: (o: Record<string, unknown>) => o.ios },
  NativeModules: {},
  NativeEventEmitter: class NativeEventEmitter {
    addListener() {
      return { remove: () => {} };
    }
    removeListener() {}
    removeAllListeners() {}
  },
  TurboModuleRegistry: {
    getEnforcing: () => ({}),
  },
}));

const unloadMock = mock(async () => {});
// 실제 모듈을 펼쳐 다른 export(getSharedLocalLLMRuntime 등)가 사라지지 않게 유지한다.
const realLocalLLM = await import('@/src/features/ai/local-llm');
mock.module('@/src/features/ai/local-llm', () => ({
  ...realLocalLLM,
  unloadSharedLocalLLM: unloadMock,
}));

const keepalive = await import('@/src/features/ai/local-llm/background-keepalive');
const { useReleaseLocalLLMOnPressure } = await import('./useReleaseLocalLLMOnPressure');
const { renderHook } = await import('@testing-library/react');
const { jest } = await import('bun:test');

const BACKGROUND_RELEASE_DELAY_MS = 30_000;

function drainKeepAlive(): void {
  while (keepalive.hasLocalLLMKeepAlive()) {
    keepalive.releaseLocalLLMKeepAlive();
  }
}

describe('useReleaseLocalLLMOnPressure', () => {
  beforeEach(() => {
    stateListeners.length = 0;
    memoryListeners.length = 0;
    unloadMock.mockClear();
    drainKeepAlive();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('백그라운드 진입 후 지연 시간이 지나면 언로드한다', () => {
    const { unmount } = renderHook(() => useReleaseLocalLLMOnPressure());

    stateListeners[0]('background');
    expect(unloadMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(BACKGROUND_RELEASE_DELAY_MS);
    expect(unloadMock).toHaveBeenCalledTimes(1);

    unmount();
  });

  test('keep-alive가 활성인 동안 백그라운드 언로드는 보류되고, 해제 후 재예약된 타이머에 의해 언로드된다', () => {
    const { unmount } = renderHook(() => useReleaseLocalLLMOnPressure());

    // 백그라운딩 직후 시작된 백그라운드 작업이 LLM을 사용 중인 시나리오
    keepalive.acquireLocalLLMKeepAlive();
    stateListeners[0]('background');
    jest.advanceTimersByTime(BACKGROUND_RELEASE_DELAY_MS);
    expect(unloadMock).not.toHaveBeenCalled(); // keep-alive가 언로드를 막음

    keepalive.releaseLocalLLMKeepAlive();
    jest.advanceTimersByTime(BACKGROUND_RELEASE_DELAY_MS);
    expect(unloadMock).toHaveBeenCalledTimes(1);

    unmount();
  });

  test('memory-warning은 keep-alive와 무관하게 즉시 언로드한다', () => {
    const { unmount } = renderHook(() => useReleaseLocalLLMOnPressure());

    keepalive.acquireLocalLLMKeepAlive();
    memoryListeners[0]('memory-warning');

    expect(unloadMock).toHaveBeenCalledTimes(1);

    unmount();
  });

  test('포그라운드 복귀는 예약된 언로드를 취소한다', () => {
    const { unmount } = renderHook(() => useReleaseLocalLLMOnPressure());

    stateListeners[0]('background');
    stateListeners[0]('active');
    jest.advanceTimersByTime(BACKGROUND_RELEASE_DELAY_MS * 2);

    expect(unloadMock).not.toHaveBeenCalled();

    unmount();
  });
});
