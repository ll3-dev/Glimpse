import { describe, expect, test } from 'bun:test';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * expo-router 라우트 파일 컨벤션 검증.
 *
 * `+` 접두 라우트는 expo-router 55의 getRoutesCore가 허용 목록 외
 * 파일에 대해 throw한다 — 잘못된 파일명(예: +error.tsx)은 앱 시작
 * 단계(라우트 파싱)에서 크래시를 일으킨다. 이 테스트는 회귀를
 * 즉시 포착한다.
 */
const APP_DIR = join(import.meta.dir, '..', '..', 'app');

/** expo-router가 공식 지원하는 + 접두 컨벤션 (getRoutesCore ignoreList) */
const ALLOWED_PLUS_ROUTES = new Set([
  '+not-found',
  '+html',
  '+api',
  '+middleware',
  '+native-intent',
]);

function collectRouteFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      collectRouteFiles(fullPath, out);
      continue;
    }
    if (/\.(tsx?|jsx?|js)$/.test(entry)) {
      out.push(entry);
    }
  }
}

describe('expo-router route conventions', () => {
  test('app/ 트리에 무효한 + 접두 라우트 파일이 없다', () => {
    const files: string[] = [];
    collectRouteFiles(APP_DIR, files);

    expect(files.length).toBeGreaterThan(0);

    const invalid = files.filter((name) => {
      if (!name.startsWith('+')) return false;
      const base = name.replace(/\.(tsx?|jsx?|js)$/, '');
      return !ALLOWED_PLUS_ROUTES.has(base);
    });

    expect(invalid).toEqual([]);
  });
});
