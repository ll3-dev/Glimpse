import { Cpu } from 'lucide-react';

interface LLMSectionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function LLMSection({ enabled, onToggle }: LLMSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold text-card-foreground">
          Local LLM
        </h3>
      </div>

      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Enable Local LLM</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Run inference locally using llama.cpp
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 ${
              enabled ? 'bg-primary' : 'bg-input'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${false ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
          <span className="text-sm text-muted-foreground">
            {false ? 'Available' : 'Unavailable'}
          </span>
        </div>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Local LLM will be available after llama.cpp integration.
          This feature is currently in development.
        </p>

        {/* Model Selector (placeholder) */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Model
          </label>
          <select
            disabled
            className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
          >
            <option>No models available</option>
          </select>
        </div>
      </div>
    </div>
  );
}
