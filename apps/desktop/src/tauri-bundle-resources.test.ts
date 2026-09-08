import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'bun:test';

/**
 * tauri.conf.json 번들 리소스 매니페스트 가드(CI recovery 2026-09-06).
 *
 * bundle.icon에 선언된 파일이 (1) 디스크에 존재하고 (2) .gitignore 규칙에
 * 무시되지 않는지 검증한다. 예전에는 src-tauri/icons/*.png가 .gitignore로
 * 무시되어 clean checkout에 필수 PNG가 없었고, 원격에서 tauri build가 아이콘
 * 누락으로 깨졌다. 매니페스트에 새 리소스를 선언하는 순간 이 가드가
 * 무시/누락을 잡아낸다.
 *
 * (2)는 git check-ignore를 직접 호출하지 않고 .gitignore 규칙을 순수 JS로
 * 평가한다 — bun test 환경에서 프로세스 spawn이 EBADF로 깨지는 런타임이
 * 있고(실측), 유닛 테스트가 외부 프로세스에 의존하지 않는 편이 견고하다.
 * 매처는 이 매니페스트에 필요한 범위(앵커된 경로 패턴, `!` 부정, `*`/`?`
 * 글롭 — `/`를 넘지 않음)만 지원한다. git 상등 검증은 수동 확인:
 * `git check-ignore -- <선언 아이콘...>` 종료코드 1(무시 없음).
 */

const SRC_TAURI = resolve(import.meta.dir, '..', 'src-tauri');
const REPO_ROOT = resolve(SRC_TAURI, '..', '..', '..');

interface TauriConfig {
  bundle?: { icon?: string[] };
}

const config: TauriConfig = JSON.parse(
  readFileSync(resolve(SRC_TAURI, 'tauri.conf.json'), 'utf8'),
);

const declaredIcons = config.bundle?.icon ?? [];

/** gitignore 패턴 → RegExp. `*`/`?`는 `/`를 넘지 않는다(gitignore 규칙 준수). */
function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map((segment) =>
      segment
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]'),
    )
    .join('/');
  return new RegExp(`^${source}$`);
}

/**
 * repo root 기준 상대경로가 규칙 줄들에 의해 무시되는지 순서대로 평가한다.
 * 마지막 매치가 승자 — gitignore의 부정(`!`) 재포함 규칙을 그대로 따른다.
 */
function isIgnored(relPath: string, ruleLines: string[]): boolean {
  let ignored = false;
  for (const rawLine of ruleLines) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const negated = line.startsWith('!');
    const pattern = (negated ? line.slice(1) : line).replace(/^\//, '');
    const target = pattern.includes('/') ? relPath : (relPath.split('/').pop() ?? relPath);
    if (patternToRegExp(pattern).test(target)) ignored = !negated;
  }
  return ignored;
}

describe('tauri bundle 리소스 매니페스트 가드', () => {
  test('bundle.icon이 선언되어 있다', () => {
    expect(declaredIcons.length).toBeGreaterThan(0);
  });

  test('선언된 모든 아이콘 파일이 디스크에 존재한다', () => {
    for (const icon of declaredIcons) {
      const bytes = readFileSync(resolve(SRC_TAURI, icon)).byteLength;
      expect(bytes).toBeGreaterThan(0);
    }
  });

  test('선언된 아이콘이 .gitignore 규칙에 무시되지 않는다 — clean checkout 누락 방지', () => {
    const ruleLines = readFileSync(resolve(REPO_ROOT, '.gitignore'), 'utf8').split('\n');
    const ignoredIcons = declaredIcons
      .map((icon) => `apps/desktop/src-tauri/${icon.replace(/^\//, '')}`)
      .filter((relPath) => isIgnored(relPath, ruleLines));
    expect(ignoredIcons).toEqual([]);
  });
});
