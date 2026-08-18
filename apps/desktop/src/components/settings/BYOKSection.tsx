import { useState, useCallback } from 'react';
import { Key, Eye, EyeOff, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DesktopSettings } from '@/lib/settings-storage';

interface BYOKSectionProps {
  settings: DesktopSettings;
  onSettingsChange: (settings: DesktopSettings) => void;
}

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { value: 'custom', label: 'Custom', baseUrl: '' },
] as const;

type ProviderValue = (typeof PROVIDER_OPTIONS)[number]['value'];

export function BYOKSection({ settings, onSettingsChange }: BYOKSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const byok = settings.byok;

  const updateByok = useCallback(
    (patch: Partial<DesktopSettings['byok']>) => {
      onSettingsChange({
        ...settings,
        byok: { ...settings.byok, ...patch },
      });
    },
    [settings, onSettingsChange],
  );

  const handleProviderChange = useCallback(
    (provider: ProviderValue) => {
      const option = PROVIDER_OPTIONS.find((o) => o.value === provider);
      updateByok({
        provider,
        baseUrl: option?.baseUrl ?? settings.byok.baseUrl,
      });
    },
    [updateByok, settings.byok.baseUrl],
  );

  const handleSave = useCallback(() => {
    onSettingsChange(settings);
    setToast('Saved');
    setTimeout(() => setToast(null), 2000);
  }, [settings, onSettingsChange]);

  const handleTestConnection = useCallback(() => {
    setToast('Not implemented');
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold text-card-foreground">
          BYOK (Bring Your Own Key)
        </h3>
      </div>

      <div className="space-y-4">
        {/* Provider Selector */}
        <div>
          <label htmlFor="byok-provider" className="block text-sm font-medium text-foreground mb-1.5">
            Provider
          </label>
          <select
            id="byok-provider"
            value={byok.provider}
            onChange={(e) => handleProviderChange(e.target.value as ProviderValue)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label htmlFor="byok-api-key" className="block text-sm font-medium text-foreground mb-1.5">
            API Key
          </label>
          <div className="relative">
            <input
              id="byok-api-key"
              type={showApiKey ? 'text' : 'password'}
              value={byok.apiKey}
              onChange={(e) => updateByok({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button
              type="button"
              aria-label={showApiKey ? "Hide API key" : "Show API key"}
              onClick={() => setShowApiKey((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label htmlFor="byok-base-url" className="block text-sm font-medium text-foreground mb-1.5">
            Base URL
          </label>
          <input
            id="byok-base-url"
            type="url"
            value={byok.baseUrl}
            onChange={(e) => updateByok({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Model Name */}
        <div>
          <label htmlFor="byok-model-name" className="block text-sm font-medium text-foreground mb-1.5">
            Model Name
          </label>
          <input
            id="byok-model-name"
            type="text"
            value={byok.model}
            onChange={(e) => updateByok({ model: e.target.value })}
            placeholder="gpt-4o-mini"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={handleTestConnection}>
            Test Connection
          </Button>
          {toast && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Check className="h-3 w-3" />
              {toast}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
