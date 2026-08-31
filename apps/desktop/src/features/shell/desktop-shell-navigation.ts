import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export const SHELL_NAVIGATION_EVENT = 'glimpse://shell-navigate';

export type DesktopShellNavigationTarget = 'capture' | 'graph';
export type ShellEventListener = (
  eventName: string,
  handler: (event: { payload: unknown }) => void,
) => Promise<UnlistenFn>;

const tauriEventListener: ShellEventListener = (eventName, handler) =>
  listen<unknown>(eventName, (event) => handler(event));

function isShellNavigationTarget(value: unknown): value is DesktopShellNavigationTarget {
  return value === 'capture' || value === 'graph';
}

export function listenForDesktopShellNavigation(
  onNavigate: (target: DesktopShellNavigationTarget) => void,
  listenToEvent: ShellEventListener = tauriEventListener,
): Promise<UnlistenFn> {
  return listenToEvent(SHELL_NAVIGATION_EVENT, ({ payload }) => {
    if (isShellNavigationTarget(payload)) {
      onNavigate(payload);
    }
  });
}
