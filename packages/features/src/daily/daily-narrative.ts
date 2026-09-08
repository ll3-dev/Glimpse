/**
 * 오늘 요약 AI 내러티브 — 순수 프롬프트/파서 코어.
 *
 * 규칙 기반 TodaySummaryCard는 유지하고, AI 문단은 증강 계층으로 붙인다
 * (2026-09-08 digest-ai-narrative 플랜). 플랫폼 무관 로직만 둔다 —
 * 생성 실행은 모바일은 summary 타깃(Apple FM/local), 데스크톱은 router.
 *
 * 지침: 2~4문장, 실제 항목명 인용, 새로 생긴 연결 언급, 캡처 0건이면
 * 생성 자체를 생략(과장 금지).
 */

import type { TodaySummary } from './today-summary';

export const DAILY_NARRATIVE_MAX_LENGTH = 400;
const DAILY_NARRATIVE_CAPTURE_LIMIT = 12;

export interface DailyNarrativeInput {
  /** 오늘 캡처 수 — 0이면 호출부가 생성을 생략한다. */
  captureCount: number;
  /** 인용용 항목 라벨 — 최신순으로 제한된 목록. */
  captureTitles: string[];
  /** 오늘 생성된 연결 수. */
  newConnectionCount: number;
}

/** 프롬프트에 넣을 항목 라벨 — 제목 없으면 미리보기 앞부분. */
function entryLabel(entry: TodaySummary['captures'][number]): string {
  const title = entry.title?.trim();
  if (title) return title;
  const preview = entry.preview.trim();
  if (!preview) return '제목 없는 기록';
  return preview.length > 40 ? `${preview.slice(0, 39)}…` : preview;
}

/** 요약 데이터셋을 프롬프트 입력으로 변환. */
export function buildDailyNarrativeInput(summary: TodaySummary): DailyNarrativeInput {
  return {
    captureCount: summary.captureCount,
    captureTitles: summary.captures
      .slice(0, DAILY_NARRATIVE_CAPTURE_LIMIT)
      .map(entryLabel),
    newConnectionCount: summary.newConnectionCount,
  };
}

/** 내러티브 생성 프롬프트 — 2~4문장, 항목명 인용, 연결 언급, 과장 금지. */
export function buildDailyNarrativePrompt(input: DailyNarrativeInput): string {
  const lines = [
    '사용자의 오늘 지식 캡처 기록을 바탕으로 오늘 하루를 정리한 짧은 회고 문단을 써 주세요.',
    '규칙:',
    '- 한국어로 2~4문장. 문단 하나만.',
    '- 실제 기록한 항목 이름을 최소 1개 인용할 것.',
    `- 오늘 새로 생긴 연결이 ${input.newConnectionCount}개 있는데 1개 이상이면 자연스럽게 언급할 것.`,
    '- 없는 사실을 지어내지 말 것. 칭찬이나 훈계보다 사실 위주의 정리.',
    '기록 목록:',
    ...input.captureTitles.map((title, index) => `${index + 1}. ${title}`),
  ];
  return lines.join('\n');
}

/** 생성 응답 정규화 — 마크다운 문법 제거, 길이 상한 컷, 공백 정리. */
export function parseDailyNarrative(response: string): string {
  const normalized = response
    // 마크다운 문법 제거 — 문단은 순수 텍스트로 표시한다
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`#>~]/g, '')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();

  if (!normalized) return '';
  if (normalized.length <= DAILY_NARRATIVE_MAX_LENGTH) return normalized;
  // 문장 경계 우선 컷 — 경계를 못 찾으면 하드 컷
  const sliced = normalized.slice(0, DAILY_NARRATIVE_MAX_LENGTH);
  const sentenceEnd = Math.max(
    sliced.lastIndexOf('. '),
    sliced.lastIndexOf('.'),
    sliced.lastIndexOf('다 '),
  );
  return sentenceEnd > DAILY_NARRATIVE_MAX_LENGTH * 0.5
    ? sliced.slice(0, sentenceEnd + 1).trim()
    : `${sliced.slice(0, DAILY_NARRATIVE_MAX_LENGTH - 1)}…`;
}

/** 캐시 키 — 일자(로컬) 단위. 재생성 시 무효화용으로도 쓴다. */
export function dailyNarrativeCacheKey(dayKey: string): string {
  return `daily_narrative:${dayKey}`;
}

/** 로컬 일자 키 — YYYY-MM-DD (로컬 자정 기준). */
export function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
