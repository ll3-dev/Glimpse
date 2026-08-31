import { describe, expect, test } from 'bun:test';
import {
  SHELL_NAVIGATION_EVENT,
  listenForDesktopShellNavigation,
  type ShellEventListener,
} from './desktop-shell-navigation';

describe('desktop shell navigation listener', () => {
  test('capture와 graph payload만 기존 route target으로 전달한다', async () => {
    let eventName = '';
    let handler: ((event: { payload: unknown }) => void) | undefined;
    const unlisten = () => undefined;
    const listen: ShellEventListener = async (name, nextHandler) => {
      eventName = name;
      handler = nextHandler;
      return unlisten;
    };
    const targets: string[] = [];

    const cleanup = await listenForDesktopShellNavigation(
      (target) => targets.push(target),
      listen,
    );
    handler?.({ payload: 'capture' });
    handler?.({ payload: 'unknown' });
    handler?.({ payload: { route: 'graph' } });
    handler?.({ payload: 'graph' });

    expect(eventName).toBe(SHELL_NAVIGATION_EVENT);
    expect(targets).toEqual(['capture', 'graph']);
    expect(cleanup).toBe(unlisten);
  });

  test('desktop entrypoint가 shell target을 기존 capture와 graph route로 연결한다', async () => {
    const main = await Bun.file(new URL('../../main.tsx', import.meta.url)).text();

    expect(main).toContain("target === 'capture'");
    expect(main).toContain("router.navigate({ to: '/capture' })");
    expect(main).toContain("router.navigate({ to: '/graph', search: {} })");
  });
});
