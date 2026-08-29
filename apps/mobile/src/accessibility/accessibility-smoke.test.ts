import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoot = new URL('../../../../', import.meta.url);

async function source(relativePath: string): Promise<string> {
  return Bun.file(new URL(relativePath, workspaceRoot)).text();
}

describe('mobile accessibility source contracts', () => {
  test('shared controls expose roles, state, and a 44pt-equivalent target', async () => {
    const [button, toggle] = await Promise.all([
      source('packages/ui/src/primitives/button.tsx'),
      source('packages/ui/src/primitives/switch.tsx'),
    ]);

    expect(button).toContain('accessibilityRole="button"');
    expect(button).toContain('accessibilityState={{ disabled: Boolean(props.disabled) }}');
    expect(toggle).toContain('accessibilityRole="switch"');
    expect(toggle).toContain('accessibilityState={{ checked, disabled }}');
    expect(toggle).toContain('hitSlop={8}');
  });

  test('destructive data actions and model controls have explicit names and state', async () => {
    const [dataSection, modelCard] = await Promise.all([
      source('apps/mobile/src/components/settings/DataManagementSection.tsx'),
      source('apps/mobile/src/components/settings/ModelDownloadCard.tsx'),
    ]);

    for (const contract of [
      'accessibilityRole="button"',
      'accessibilityLabel={title}',
      'accessibilityHint={description}',
      'accessibilityState={{ busy, disabled }}',
      'min-h-14',
    ]) {
      expect(dataSection).toContain(contract);
    }
    expect(modelCard).toContain('accessibilityState={{ disabled: !canDownload }}');
    expect(modelCard).toContain('accessibilityState={{ disabled: !canSelect }}');
    expect(modelCard).toContain('min-h-11');
    expect(modelCard).toContain('min-w-11');
  });

  test('animated status surfaces honor the system reduced-motion preference', async () => {
    const [bannerAnimation, toast] = await Promise.all([
      source(
        'apps/mobile/src/components/settings/useGlobalModelDownloadBannerAnimation.ts',
      ),
      source('apps/mobile/src/components/common/Toast.tsx'),
    ]);

    expect(bannerAnimation).toContain('useReducedMotion()');
    expect(bannerAnimation).toContain('.enabled(!reduceMotion)');
    expect(toast).toContain('useReducedMotion()');
    expect(toast).toContain('reduceMotion ? 0');
  });

  test('every app screen and component resolves colors through semantic tokens', () => {
    // Walk the whole app/ + components/ trees instead of enumerating
    // "modernized" files — a hardcoded hex in any new screen fails here,
    // and no file can silently escape the contract when a list rots.
    const roots = [
      join(import.meta.dir, '..', '..', 'app'),
      join(import.meta.dir, '..', '..', 'src', 'components'),
    ];

    const sources: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (/\.tsx?$/.test(entry)) {
          sources.push(readFileSync(fullPath, 'utf8'));
        }
      }
    };
    for (const root of roots) walk(root);

    expect(sources.length).toBeGreaterThan(30);

    const offenders = sources.filter((contents) => /#[0-9a-fA-F]{6}/.test(contents));
    expect(offenders).toEqual([]);
  });
});
