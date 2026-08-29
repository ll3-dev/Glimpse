import type { ReactNode } from 'react';
import { useRouterState, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, GripHorizontal, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { triggerWindowDrag } from '@/lib/window-drag';

interface MainPanelProps {
  children: ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  '/library': '보관함',
  '/chat': '채팅',
  '/review': '다시 보기',
  '/digest': '다이제스트',
  '/graph': '지식 그래프',
  '/settings': '설정',
  '/capture': '새 지식 기록',
};

export function MainPanel({ children }: MainPanelProps) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const navigate = useNavigate();

  const currentKey = Object.keys(ROUTE_LABELS).find((key) => pathname.startsWith(key)) ?? '/library';
  const currentLabel = ROUTE_LABELS[currentKey] ?? 'Glimpse';

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Notion-style Top Window Header & Drag Region */}
      {/* `deep`: 하위 트리 전체가 드래그 존 — 자식으로 덮인 헤더에서도 여백
          없이 끌 수 있다. 버튼·링크는 Tauri가 자동 제외한다. */}
      <header
        data-tauri-drag-region="deep"
        onMouseDown={triggerWindowDrag}
        className="flex h-11 w-full shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 select-none backdrop-blur-xs cursor-grab active:cursor-grabbing"
      >
        {/* Left: Navigation History & Breadcrumbs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              title="뒤로 가기"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => window.history.forward()}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              title="앞으로 가기"
              aria-label="앞으로 가기"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-border/70" />

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-muted-foreground/80">Glimpse</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="font-semibold text-foreground">{currentLabel}</span>
          </div>
        </div>

        {/* Center: Visible Draggable Grip Capsule */}
        <div
         
          className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 py-0.8 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing shadow-2xs"
          title="클릭하고 드래그하여 창을 이동할 수 있습니다"
        >
          <GripHorizontal className="h-3.5 w-3.5 opacity-60" />
          <span className="select-none text-[11px]">창 이동</span>
        </div>

        {/* Right: Quick Window Action Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: '/library' })}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground active:scale-98 shadow-2xs"
            title="지식 검색 (⌘K)"
          >
            <Search className="h-3 w-3" />
            <span className="hidden sm:inline">검색</span>
            <kbd className="rounded bg-muted/70 px-1 py-0.2 font-mono text-[9px] text-muted-foreground">⌘K</kbd>
          </button>

          <Button
            size="sm"
            onClick={() => navigate({ to: '/capture' })}
            className="h-7 gap-1 rounded-lg bg-app-text px-2.5 text-xs font-medium text-app-bg shadow-2xs hover:opacity-90 active:scale-98"
            title="새 지식 기록 (⌘N)"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">새 기록</span>
          </Button>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
