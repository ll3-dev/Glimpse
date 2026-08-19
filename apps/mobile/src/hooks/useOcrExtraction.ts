import { useCallback, useState } from 'react';
import { runOcr } from '@/src/features/capture/ocr/ocr-service';
import { logger } from '@/src/utils/logger';

export type OcrState = 'idle' | 'running' | 'done' | 'no_text' | 'error';

/**
 * 스크린샷 선택 후 온디바이스 OCR 실행을 관장하는 훅.
 * 폼 컴포넌트 복잡도를 낮추기 위해 상태와 호출을 캡슐화한다.
 */
export function useOcrExtraction() {
  const [ocrState, setOcrState] = useState<OcrState>('idle');

  const extract = useCallback(
    async (imageUri: string): Promise<string | null> => {
      setOcrState('running');
      try {
        const outcome = await runOcr(imageUri);
        if (outcome.status === 'ok') {
          setOcrState('done');
          return outcome.text;
        }
        setOcrState(outcome.status === 'no_text' ? 'no_text' : 'error');
        return null;
      } catch (error) {
        logger.error('OCR extraction failed', error);
        setOcrState('error');
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => setOcrState('idle'), []);

  return { ocrState, extract, reset };
}
