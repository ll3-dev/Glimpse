import { useRouterState, useNavigate } from '@tanstack/react-router';
import {
  BookOpen,
  MessageSquare,
  RotateCcw,
  Newspaper,
  Settings,
  Plus,
  Network,
  ChevronsUpDown,
  Search,
  SquarePen,
} from 'lucide-react';
import { GlimpseLogo } from '@/components/common/GlimpseLogo';
import { useDueItemsQuery, useRecommendationsQuery } from '@glimpse/hooks';
import { triggerWindowDrag } from '@/lib/window-drag';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  badgeColor?: string;
}

export function AppSidebar() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const navigate = useNavigate();

  const { data: dueItems = [] } = useDueItemsQuery();
  const { data: recommendations = [] } = useRecommendationsQuery();

  const navItems: NavItem[] = [
    { label: '보관함', icon: BookOpen, path: '/library' },
    { label: '채팅', icon: MessageSquare, path: '/chat' },
    {
      label: '다시 보기',
      icon: RotateCcw,
      path: '/review',
      badge: dueItems.length > 0 ? dueItems.length : undefined,
      badgeColor: 'bg-tag-mint-bg text-tag-mint-text',
    },
    {
      label: '다이제스트',
      icon: Newspaper,
      path: '/digest',
      badge: recommendations.length > 0 ? recommendations.length : undefined,
      badgeColor: 'bg-tag-peach-bg text-tag-peach-text',
    },
    { label: '지식 그래프', icon: Network, path: '/graph' },
    { label: '설정', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar select-none">
      {/* Top Window Drag & Action Bar (Notion Style) */}
      <div
        data-tauri-drag-region
        onMouseDown={triggerWindowDrag}
        className="flex h-11 w-full shrink-0 items-center justify-between border-b border-border/80 px-3 cursor-grab active:cursor-grabbing"
      >
        {/* Traffic Light Clearance Zone */}
        <div className="h-full w-20 shrink-0" data-tauri-drag-region />

        {/* Quick Top Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate({ to: '/capture' })}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-95"
            title="새 지식 기록 (⌘N)"
            aria-label="새 지식 기록"
          >
            <SquarePen className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Workspace Switcher Header */}
      <div className="px-2 pb-1.5">
        <button
          type="button"
          onClick={() => navigate({ to: '/library' })}
          className="group flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent/70 active:bg-sidebar-accent"
          aria-label="워크스페이스"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-app-bg shadow-2xs">
              <GlimpseLogo size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                Glimpse
              </div>
              <div className="truncate text-[11px] font-medium leading-tight text-muted-foreground">
                내 지식 보관함
              </div>
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
        </button>

        {/* Quick Search Button (Notion Style) */}
        <button
          type="button"
          onClick={() => navigate({ to: '/library' })}
          className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>지식 검색...</span>
          </div>
          <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate({ to: item.path })}
              className={`
                flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-medium
                transition-colors
                ${
                  isActive
                    ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-2xs'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                }
              `}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge != null && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    item.badgeColor ?? 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick capture CTA bottom button */}
      <div className="border-t border-border/70 p-2.5">
        <button
          type="button"
          onClick={() => navigate({ to: '/capture' })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-app-text px-3 py-2 text-sm font-medium text-app-bg shadow-2xs transition-all hover:opacity-90 active:scale-98"
        >
          <Plus className="h-4 w-4" />
          새 기록
        </button>
      </div>
    </aside>
  );
}
