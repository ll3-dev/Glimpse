import { useRouterState, useNavigate } from '@tanstack/react-router';
import {
  BookOpen,
  MessageSquare,
  RotateCcw,
  Newspaper,
  Settings,
  Plus,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Library', icon: BookOpen, path: '/library' },
  { label: 'Chat', icon: MessageSquare, path: '/chat' },
  { label: 'Review', icon: RotateCcw, path: '/review' },
  { label: 'Digest', icon: Newspaper, path: '/digest' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function AppSidebar() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const navigate = useNavigate();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center px-5">
        <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Glimpse
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate({ to: item.path })}
              className={`
                flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium
                transition-colors
                ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* New capture button */}
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => navigate({ to: '/capture' })}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>
    </aside>
  );
}
