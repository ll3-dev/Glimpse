import { useEffect } from 'react';
import { AppState } from 'react-native';
import { hasLocalLLMKeepAlive } from '@/src/features/ai/local-llm/background-keepalive';
import { unloadSharedLocalLLM } from '@/src/features/ai/local-llm';
import { logger } from '@/src/utils/logger';
import { useTimeoutScheduler } from './useTimeoutScheduler';

const BACKGROUND_RELEASE_DELAY_MS = 30_000;

export function useReleaseLocalLLMOnPressure(): void {
  const { schedule, cancel } = useTimeoutScheduler();

  useEffect(() => {
    const release = (reason: 'background' | 'memory-warning') => {
      // 백그라운드 작업이 아직 LLM을 사용 중이면 언로드를 보류하고
      // 지연 시간 뒤 다시 확인한다. 메모리 경고는 keep-alive보다 우선한다.
      if (reason === 'background' && hasLocalLLMKeepAlive()) {
        schedule(() => release('background'), BACKGROUND_RELEASE_DELAY_MS);
        return;
      }

      void unloadSharedLocalLLM().catch((error) => {
        logger.error('Failed to unload local LLM', error, { reason });
      });
    };

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      cancel();
      if (nextState !== 'active') {
        schedule(() => release('background'), BACKGROUND_RELEASE_DELAY_MS);
      }
    });
    const memorySubscription = AppState.addEventListener('memoryWarning', () => {
      cancel();
      release('memory-warning');
    });

    return () => {
      cancel();
      appStateSubscription.remove();
      memorySubscription.remove();
    };
  }, [cancel, schedule]);
}
