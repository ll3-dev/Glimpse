import { useState, useCallback } from 'react';
import { Key, Eye, EyeOff, Save, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DesktopSettings } from '@/lib/settings-storage';

interface BYOKSectionProps {
  settings: DesktopSettings;
  onSettingsChange: (settings: DesktopSettings) => void;
}

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { value: 'anthropic', label: 'Anthropic', baseUrl: '' },
  { value: 'google', label: 'Google Gemini', baseUrl: '' },
  { value: 'custom', label: '사용자 지정 (Custom)', baseUrl: '' },
] as const;

type ProviderValue = (typeof PROVIDER_OPTIONS)[number]['value'];

export function BYOKSection({ settings, onSettingsChange }: BYOKSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

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
    setToast('설정이 저장되었습니다');
    setTimeout(() => setToast(null), 2500);
  }, [settings, onSettingsChange]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setToast('연결 테스트 중...');
    try {
      // 현재 폼 값으로 프로바이더를 만들어 최소 완성 요청을 시도
      const { createBYOKProvider } = await import('@/features/ai/providers/byok-provider');
      const provider = createBYOKProvider({
        provider: byok.provider,
        apiKey: byok.apiKey,
        baseUrl: byok.baseUrl,
        model: byok.model,
      });
      await provider.complete({ prompt: 'ping', maxTokens: 1 });
      setToast('연결 성공: API가 정상 작동합니다');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setToast(`연결 실패: ${message.slice(0, 120)}`);
    } finally {
      setTesting(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, [byok.provider, byok.apiKey, byok.baseUrl, byok.model]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <Key className="h-4 w-4 text-app-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          개인 API 키 설정 (BYOK)
        </h2>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <div className="space-y-4">
          {/* Provider Selector */}
          <div>
            <label htmlFor="byok-provider" className="mb-1.5 block text-xs font-semibold text-foreground">
              제공자 (Provider)
            </label>
            <select
              id="byok-provider"
              value={byok.provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderValue)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
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
            <label htmlFor="byok-api-key" className="mb-1.5 block text-xs font-semibold text-foreground">
              API 키 (API Key)
            </label>
            <div className="relative">
              <input
                id="byok-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={byok.apiKey}
                onChange={(e) => updateByok({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
              />
              <button
                type="button"
                aria-label={showApiKey ? 'API 키 숨기기' : 'API 키 보기'}
                onClick={() => setShowApiKey((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label htmlFor="byok-base-url" className="mb-1.5 block text-xs font-semibold text-foreground">
              엔드포인트 URL (Base URL)
            </label>
            <input
              id="byok-base-url"
              type="url"
              value={byok.baseUrl}
              onChange={(e) => updateByok({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
            />
          </div>

          {/* Model Name */}
          <div>
            <label htmlFor="byok-model-name" className="mb-1.5 block text-xs font-semibold text-foreground">
              모델 식별자 (Model Name)
            </label>
            <input
              id="byok-model-name"
              type="text"
              value={byok.model}
              onChange={(e) => updateByok({ model: e.target.value })}
              placeholder="gpt-4o-mini"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              className="gap-1.5 rounded-xl bg-app-text text-app-bg hover:opacity-90"
            >
              <Save className="h-4 w-4" />
              저장
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleTestConnection()}
              disabled={testing || !byok.apiKey}
              className="gap-1.5 rounded-xl"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              연결 테스트
            </Button>
            {toast && (
              <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                <Check className="h-3.5 w-3.5 text-green-600" />
                {toast}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
