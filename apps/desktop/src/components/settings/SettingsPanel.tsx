import { useState, useCallback, type ReactNode } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { BYOKSection } from './BYOKSection';
import { ModelManagerSection } from './ModelManagerSection';
import { loadSettings, saveSettings, type DesktopSettings } from '@/lib/settings-storage';

type AiProvider = DesktopSettings['aiProvider'];

const PROVIDER_OPTIONS: { value: AiProvider; label: string; description: string }[] = [
  { value: 'rules', label: 'Rules', description: 'Use rule-based labeling only' },
  { value: 'byok', label: 'BYOK', description: 'Bring your own API key' },
  { value: 'local-llm', label: 'Local LLM', description: 'Run inference locally (coming soon)' },
];

export function SettingsPanel() {
  const [settings, setSettings] = useState<DesktopSettings>(() => loadSettings());

  const handleSettingsChange = useCallback((next: DesktopSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>

      {/* AI Provider Section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          AI Provider
        </h2>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground mb-4">
            Select the active AI provider for labeling and processing.
          </p>
          <div className="space-y-2">
            {PROVIDER_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  settings.aiProvider === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="aiProvider"
                  value={opt.value}
                  checked={settings.aiProvider === opt.value}
                  onChange={() => handleSettingsChange({ ...settings, aiProvider: opt.value })}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-border" />

      {/* BYOK Section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          BYOK Configuration
        </h2>
        <BYOKSection settings={settings} onSettingsChange={handleSettingsChange} />
      </section>

      {/* Divider */}
      <hr className="border-border" />

      {/* Local LLM Section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Local LLM
        </h2>
        <ModelManagerSection
          enabled={settings.localLlm.enabled}
          onToggle={(enabled) =>
            handleSettingsChange({
              ...settings,
              localLlm: { ...settings.localLlm, enabled },
            })
          }
        />
      </section>
    </div>
  );
}
