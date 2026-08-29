import type React from 'react';

/**
 * Initiates native macOS / Windows desktop window dragging.
 * Directly invokes custom Tauri Rust command `start_window_dragging`
 * with fallback to `getCurrentWindow().startDragging()`.
 */
export async function triggerWindowDrag(e: React.MouseEvent): Promise<void> {
  // Only trigger on primary (left) click
  if (e.button !== 0) return;

  // Ignore clicks on interactive controls — Tauri 네이티브 drag.js의 제외
  // 목록(CLICKABLE_TAGS + INTERACTIVE_ROLES)과 일치시킨다.
  const target = e.target as HTMLElement | null;
  if (
    target?.closest(
      'button, input, textarea, select, a, label, summary, kbd, [contenteditable="true"], [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="option"]',
    )
  ) {
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('start_window_dragging');
  } catch {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startDragging();
    } catch {
      // Ignored outside Tauri runtime (e.g. browser / tests)
    }
  }
}
