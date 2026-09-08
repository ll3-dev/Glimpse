import { describe, expect, test } from 'bun:test';
import {
  buildDailyNarrativeInput,
  buildDailyNarrativePrompt,
  parseDailyNarrative,
  toLocalDayKey,
  dailyNarrativeCacheKey,
  DAILY_NARRATIVE_MAX_LENGTH,
} from './daily-narrative';
import type { TodaySummary } from './today-summary';

function makeSummary(overrides?: Partial<TodaySummary>): TodaySummary {
  return {
    captureCount: 2,
    captures: [
      {
        id: 'a',
        title: 'Rust 소유권 노트',
        preview: '소유권은 값의 이동 규칙이다',
        type: 'note',
        createdAt: 1_000,
      },
      {
        id: 'b',
        title: null,
        preview: '링크 없이 저장된 스크린샷 내용 발췌입니다',
        type: 'screenshot',
        createdAt: 2_000,
      },
    ],
    newConnectionCount: 3,
    ...overrides,
  };
}

describe('buildDailyNarrativeInput', () => {
  test('제목 없는 항목은 미리보기 앞부분을 라벨로 쓴다', () => {
    const input = buildDailyNarrativeInput(makeSummary());

    expect(input.captureCount).toBe(2);
    expect(input.newConnectionCount).toBe(3);
    expect(input.captureTitles).toEqual([
      'Rust 소유권 노트',
      '링크 없이 저장된 스크린샷 내용 발췌입니다',
    ]);
  });

  test('빈 미리보기 항목은 대체 라벨로 떨어진다', () => {
    const summary = makeSummary({
      captures: [
        { id: 'x', title: null, preview: '   ', type: 'note', createdAt: 1 },
      ],
    });
    expect(buildDailyNarrativeInput(summary).captureTitles).toEqual(['제목 없는 기록']);
  });

  test('캡처 0건을 그대로 반영한다 — 호출부가 생성을 생략할 근거', () => {
    const input = buildDailyNarrativeInput(
      makeSummary({ captureCount: 0, captures: [], newConnectionCount: 0 }),
    );
    expect(input.captureCount).toBe(0);
    expect(input.captureTitles).toEqual([]);
  });
});

describe('buildDailyNarrativePrompt', () => {
  test('실제 항목명과 연결 수가 프롬프트에 인용된다', () => {
    const prompt = buildDailyNarrativePrompt(
      buildDailyNarrativeInput(makeSummary()),
    );

    expect(prompt).toContain('Rust 소유권 노트');
    expect(prompt).toContain('1. ');
    expect(prompt).toContain('2~4문장');
    expect(prompt).toContain('3개');
  });
});

describe('parseDailyNarrative', () => {
  test('마크다운 문법을 제거하고 공백을 정리한다', () => {
    const parsed = parseDailyNarrative('  **오늘** `기록`\n\n- Rust 노트를 저장했다.  ');
    expect(parsed).toBe('오늘 기록 Rust 노트를 저장했다.');
  });

  test('빈 응답은 빈 문자열', () => {
    expect(parseDailyNarrative('   \n```\n``` ')).toBe('');
  });

  test('길이 상한을 넘으면 문장 경계에서 자른다', () => {
    const sentence = '오늘은 다양한 기록을 남겼다.'.repeat(40); // 600자 이상
    const parsed = parseDailyNarrative(sentence);
    expect(parsed.length).toBeLessThanOrEqual(DAILY_NARRATIVE_MAX_LENGTH);
    expect(parsed.endsWith('다.')).toBe(true);
  });

  test('문장 경계를 못 찾으면 하드 컷 + 생략 부호', () => {
    const parsed = parseDailyNarrative('가'.repeat(600));
    expect(parsed.length).toBe(DAILY_NARRATIVE_MAX_LENGTH);
    expect(parsed.endsWith('…')).toBe(true);
  });

  test('링크 문법은 표현만 벗겨 텍스트를 유지한다', () => {
    expect(parseDailyNarrative('[Rust 노트](https://example.com)를 저장했다.')).toBe(
      'Rust 노트를 저장했다.',
    );
  });
});

describe('캐시 키', () => {
  test('일자 키는 로컬 달력 기준 YYYY-MM-DD', () => {
    expect(toLocalDayKey(new Date(2026, 8, 8, 23, 59))).toBe('2026-09-08');
    expect(toLocalDayKey(new Date(2026, 0, 3, 0, 0))).toBe('2026-01-03');
    expect(dailyNarrativeCacheKey('2026-09-08')).toBe('daily_narrative:2026-09-08');
  });
});
