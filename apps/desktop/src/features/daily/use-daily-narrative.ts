import { useCallback, useEffect, useRef, useState } from 'react';
import type { TodaySummary } from '@glimpse/features';
import {
  generateDailyNarrative,
  getCachedDailyNarrative,
} from './generate-daily-narrative';

/**
 * 오늘 요약 AI 내러티브 — 일자 키 캐시 + 하루 1회 자동 생성 + 수동 재생성.
 *
 * 자동 생성은 데이터가 도착했을 때(캡처 존재 플래그 전환) 캐시가 비어 있을
 * 때만 실행한다 — 데스크톱은 상시 실행 앱이므로 포그라운드 리스너 대신
 * 캐시 플래그로 충분하다.
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
  }, [hasCaptures, regenerate]);

  return { narrative, isGenerating, regenerate };
}
