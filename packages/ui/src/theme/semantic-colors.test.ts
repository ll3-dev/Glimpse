import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CSS_VARIABLES } from './semantic-colors';

// 차트 팔레트 토큰이 시맨틱 훅과 CSS 양쪽에 light/dark 쌍으로 존재해야 한다.
// (모바일 그래프 노드 점 색상 — 데스크톱 --chart-*와 동일 팔레트)

describe('차트 팔레트 시맨틱 토큰', () => {
  test('chart1~5가 CSS 변수에 매핑된다', () => {
    expect(CSS_VARIABLES.chart1).toBe('--color-chart-1');
    expect(CSS_VARIABLES.chart2).toBe('--color-chart-2');
    expect(CSS_VARIABLES.chart3).toBe('--color-chart-3');
    expect(CSS_VARIABLES.chart4).toBe('--color-chart-4');
    expect(CSS_VARIABLES.chart5).toBe('--color-chart-5');
  });

  test('globals.css @theme에 5색이 선언된다', () => {
    const css = readFileSync(join(import.meta.dir, '../../styles/globals.css'), 'utf8');
    for (const n of [1, 2, 3, 4, 5]) {
      expect(css).toContain(`--color-chart-${n}:`);
    }
  });

  test('dark @variant 블록에도 5색 오버라이드가 선언된다', () => {
    const css = readFileSync(join(import.meta.dir, '../../styles/globals.css'), 'utf8');
    const darkBlock = css.slice(css.indexOf('@variant dark'), css.indexOf('@variant light'));
    for (const n of [1, 2, 3, 4, 5]) {
      expect(darkBlock).toContain(`--color-chart-${n}:`);
    }
  });
});
