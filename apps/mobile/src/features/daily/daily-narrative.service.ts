/**
 * 오늘 요약 AI 내러티브 서비스(모바일) — 생성 실행 + 일자 키 캐시.
 *
 * 순수 프롬프트/파서는 @glimpse/features(daily-narrative)가 담당하고,
 * 여기서는 summary 타깃 라우팅과 MMKV 캐시만 담당한다.
 *
 * 라우팅: Apple FM 우선 → local 추천 모델 → stub(문단 숨김으로 동작).
 * 캡처 0건이면 생성 자체를 생략한다(과장 금지).
 */

import {
  buildDailyNarrativeInput,
  buildDailyNarrativePrompt,
  parseDailyNarrative,
  dailyNarrativeCacheKey,
  toLocalDayKey,
  type TodaySummary,
} from '@glimpse/features';
import { storage } from '@/src/lib/storage';
import type { Result } from '@/src/lib/effect-result';
import {
  executeSummaryTarget,
  resolveEffectiveTarget,
} from '@/src/features/ai/targets';
import type { AITarget } from '@/src/features/ai/targets';

interface DailyNarrativeCacheEntry {
  /** 캐시가 쓰인 날(로컬 일자 키) — 키와 불일치하면 무시한다. */
  dayKey: string;
  narrative: string;
  /** 생성 시각(ms) — 재생성 UX 표시용. */
  generatedAt: number;
}

export function getCachedDailyNarrative(dayKey = toLocalDayKey(new Date())): string | null {
  try {
    const raw = storage.getString(dailyNarrativeCacheKey(dayKey));
    if (!raw) return null;
    const entry = JSON.parse(raw) as DailyNarrativeCacheEntry;
    if (entry.dayKey !== dayKey || !entry.narrative) return null;
    return entry.narrative;
  } catch {
    return null;
  }
}

export function setCachedDailyNarrative(narrative: string, dayKey = toLocalDayKey(new Date())): void {
  const entry: DailyNarrativeCacheEntry = {
    dayKey,
    narrative,
    generatedAt: Date.now(),
  };
  // 어제 캐시는 덮어쓰며 정리 — 단일 슬롯만 유지한다.
  storage.set(dailyNarrativeCacheKey(dayKey), JSON.stringify(entry));
}

/** 내러티브 생성 — 미지원 타깃(stub/rules)·캡처 0건·실패는 null(숨김). */
export async function generateDailyNarrative(
  summary: TodaySummary,
  deps?: {
    resolveTarget?: (feature: 'summary') => AITarget;
    execute?: (target: AITarget, prompt: string) => Promise<Result<string>>;
  },
): Promise<string | null> {
  const input = buildDailyNarrativeInput(summary);
  if (input.captureCount === 0) return null;

  const target = (deps?.resolveTarget ?? resolveEffectiveTarget)('summary');
  if (target.kind !== 'apple' && target.kind !== 'local') return null;

  const execute = deps?.execute ?? executeSummaryTarget;
  const result = await execute(target, buildDailyNarrativePrompt(input));
  if (!result.success) {
    return null;
  }

  const narrative = parseDailyNarrative(result.data);
  if (!narrative) return null;
  setCachedDailyNarrative(narrative);
  return narrative;
}
