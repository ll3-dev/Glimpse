import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemePreference, type ThemePreference } from '@/hooks/useThemePreference';

const OPTIONS: { value: ThemePreference; label: string; icon: React.ElementType }[] = [
  { value: 'system', label: '시스템', icon: Monitor },
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
];

/** 라이트/다크/시스템 테마 선택 — `.dark` 클래스 토글은 useThemePreference가 담당. */
export function ThemeSection() {
  const { theme, setTheme } = useThemePreference();

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <Sun className="h-4 w-4 text-app-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          테마 (Theme)
        </h2>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          앱 색상 테마를 선택합니다. 시스템 설정을 따르면 OS의 다크 모드와 자동으로 동기화됩니다.
        </p>
        <div className="flex gap-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                aria-pressed={active}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                  active
                    ? 'border-foreground/40 bg-muted/40 shadow-2xs text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
