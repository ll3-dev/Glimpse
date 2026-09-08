/**
 * 오늘 요약 AI 내러티브 생성(데스크톱) — router 경유 비챗 생성.
 *
 * rules 프로바이더(또는 로컬 모델 미로드로 rules 폴백)면 요청하지 않고
 * null — 카드 자체는 유지하되 AI 문단만 조용히 숨긴다.
 * 캡처 0건이면 생성을 생략한다(과장 금지).
 */

import {
  buildDailyNarrativeInput,
  buildDailyNarrativePrompt,
  parseDailyNarrative,
  dailyNarrativeCacheKey,
  toLocalDayKey,
  type TodaySummary,
} from '@glimpse/features';
import { getProviderForFeature } from '@/features/ai/router';
import { loadSettings } from '@/lib/settings-storage';

/** 일자 키 캐시 읽기 — 키와 불일치하는 엔트리는 무시한다. */
export function getCachedDailyNarrative(dayKey = toLocalDayKey(new Date())): string | null {
  try {
    const raw = localStorage.getItem(dailyNarrativeCacheKey(dayKey));
    if (!raw) return null;
    const entry = JSON.parse(raw) as { dayKey: string; narrative: string };
    if (entry.dayKey !== dayKey || !entry.narrative) return null;
    return entry.narrative;
  } catch {
    return null;
  }
}

export function setCachedDailyNarrative(narrative: string, dayKey = toLocalDayKey(new Date())): void {
  localStorage.setItem(
    dailyNarrativeCacheKey(dayKey),
    JSON.stringify({ dayKey, narrative, generatedAt: Date.now() }),
  );
}

/** 라우터가 준 프로바이더 왕복 의존성 — 테스트에서 대체한다. */
export interface NarrativeProviderDeps {
  getProvider: typeof getProviderForFeature;
}

/**
 * 내러티브 생성 — 미지원(rules/stub)·캡처 0건·실패는 null(문단 숨김).
 */
export async function generateDailyNarrative(
  summary: TodaySummary,
  deps: NarrativeProviderDeps = { getProvider: getProviderForFeature },
): Promise<string | null> {
  const input = buildDailyNarrativeInput(summary);
  if (input.captureCount === 0) return null;

  // rules 프로바이더면 요청하지 않는다 — 조용한 폴백
  if (loadSettings().aiProvider === 'rules') return null;

  const provider = await deps.getProvider('metadata');
  if (provider.kind === 'rules' || provider.kind === 'stub') return null;

  try {
    const response = await provider.complete({
      prompt: buildDailyNarrativePrompt(input),
      maxTokens: 256,
      temperature: 0.4,
    });
    const narrative = parseDailyNarrative(response.text);
    if (!narrative) return null;
    setCachedDailyNarrative(narrative);
    return narrative;
  } catch {
    // 생성 실패는 문단 숨김으로 흡수 — 카드의 규칙 기반 요약은 유지된다
    return null;
  }
}
