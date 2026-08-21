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
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        {/* Icon + heading */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-card-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. You can try reloading or report the issue.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button onClick={onReload}>
            <RotateCcw className="size-4" />
            Reload
          </Button>
          <a
            href="https://github.com/ll3-dev/Glimpse/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-4" />
            Report Issue
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
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        Error details
      </button>

      {expanded && (
        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {error && <>{String(error.message)}{'\n\n'}</>}
          {error?.stack && <>{error.stack}{'\n\n'}</>}
          {componentStack && <>Component stack:{'\n'}{componentStack}</>}
        </pre>
      )}
    </div>
  );
}
