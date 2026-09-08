import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { TodaySummary } from '@glimpse/features';
import {
  generateDailyNarrative,
  getCachedDailyNarrative,
} from '@/src/features/daily/daily-narrative.service';

/**
 * 오늘 요약 AI 내러티브 — 일자 키 캐시 + 하루 1회 자동 생성.
 *
 * 자동 생성은 데이터가 도착했을 때(캡처 존재 플래그 전환)와 앱 포그라운드
 * 진입 시, 캐시가 비어 있을 때만 실행한다(useAppForegroundLabeling 포그라운드
 * 잡 패턴). 재생성은 수동 액션만 — 캐시를 덮어쓴다.
 */
export function useDailyNarrative(summary: TodaySummary) {
  const [narrative, setNarrative] = useState<string | null>(() => getCachedDailyNarrative());
  const [isGenerating, setIsGenerating] = useState(false);

  // 최신 summary를 참조하되 이펙트 재실행은 막는다 — 렌더 중 ref 쓰기 금지.
  const summaryRef = useRef(summary);
  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);

  const isRunningRef = useRef(false);

  const regenerate = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsGenerating(true);
    try {
      const result = await generateDailyNarrative(summaryRef.current);
      setNarrative(result);
    } finally {
      setIsGenerating(false);
      isRunningRef.current = false;
    }
  }, []);

  const hasCaptures = summary.captureCount > 0;
  useEffect(() => {
    // 하루 1회 — 캐시가 있으면 재생성하지 않는다.
    if (!hasCaptures || getCachedDailyNarrative()) return;
    void regenerate();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !getCachedDailyNarrative()) {
        void regenerate();
      }
    });
    return () => subscription.remove();
  }, [hasCaptures, regenerate]);

  return { narrative, isGenerating, regenerate };
}
