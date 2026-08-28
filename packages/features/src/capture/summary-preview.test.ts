import { describe, expect, it } from 'bun:test';
import { buildSummaryPreview } from './summary-preview';

describe('buildSummaryPreview', () => {
  it('빈 본문은 빈 문자열', () => {
    expect(buildSummaryPreview('')).toBe('');
    expect(buildSummaryPreview('   ')).toBe('');
  });
  it('첫 완결 문장을 추출한다', () => {
    const first = '첫 번째 문장입니다. 두 번째 문장은 잘립니다.';
    expect(buildSummaryPreview(first)).toBe('첫 번째 문장입니다.');
  });
  it('영문 문장부도 처리', () => {
    expect(buildSummaryPreview('First sentence. Second one.')).toBe('First sentence.');
  });
  it('문장이 140자를 넘으면 경계에서 절단', () => {
    const long = '가'.repeat(200) + '. 뒤 문장';
    const out = buildSummaryPreview(long);
    expect(out.length).toBeLessThanOrEqual(140);
    expect(out.endsWith('...')).toBe(true);
  });
  it('140자 이하 완결 문장이 없으면 첫 줄을 반환', () => {
    expect(buildSummaryPreview('줄바꿈만 있는 첫 줄\n두 번째 줄')).toBe('줄바꿈만 있는 첫 줄');
  });
});
