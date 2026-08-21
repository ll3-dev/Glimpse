import { useEffect } from 'react';
import { AppState } from 'react-native';
import { unloadSharedLocalLLM } from '@/src/features/ai/local-llm';
import { logger } from '@/src/utils/logger';
import { useTimeoutScheduler } from './useTimeoutScheduler';

const BACKGROUND_RELEASE_DELAY_MS = 30_000;

export function useReleaseLocalLLMOnPressure(): void {
  const { schedule, cancel } = useTimeoutScheduler();

  useEffect(() => {
    const release = (reason: 'background' | 'memory-warning') => {
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
