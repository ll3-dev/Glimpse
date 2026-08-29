import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureDiagnostic } from '@glimpse/shared';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log for debugging -- could be wired to a telemetry endpoint later.
    console.error('[ErrorBoundary]', error, errorInfo);
    captureDiagnostic('error', 'Desktop React ErrorBoundary', error);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} onReload={this.handleReload} />;
  }
}

// ---------------------------------------------------------------------------
// Fallback UI
// ---------------------------------------------------------------------------

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReload: () => void;
}

function ErrorFallback({ error, errorInfo, onReload }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        {/* Icon + heading */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-card-foreground">오류가 발생했습니다</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              예기치 못한 문제가 발생했습니다. 화면을 다시 불러오거나 문제가 지속되면 이슈를 제보해 주세요.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button onClick={onReload} className="gap-1.5 rounded-xl bg-app-text text-app-bg hover:opacity-90">
            <RotateCcw className="size-4" />
            다시 불러오기
          </Button>
          <a
            href="https://github.com/ll3-dev/Glimpse/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            이슈 제보
          </a>
        </div>

        {/* Collapsible error details */}
        <ErrorDetails error={error} componentStack={errorInfo?.componentStack ?? null} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible error details (uses hooks, so must be a function component)
// ---------------------------------------------------------------------------

interface ErrorDetailsProps {
  error: Error | null;
  componentStack: string | null;
}

function ErrorDetails({ error, componentStack }: ErrorDetailsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!error && !componentStack) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        상세 오류 정보 (Error details)
      </button>

      {expanded && (
        <pre className="max-h-48 overflow-auto rounded-xl bg-muted/70 p-3.5 text-[11px] leading-relaxed text-muted-foreground font-mono">
          {error && <>{String(error.message)}{'\n\n'}</>}
          {error?.stack && <>{error.stack}{'\n\n'}</>}
          {componentStack && <>Component stack:{'\n'}{componentStack}</>}
        </pre>
      )}
    </div>
  );
}
