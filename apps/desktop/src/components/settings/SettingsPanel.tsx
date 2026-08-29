import { useState, useCallback } from 'react';
import { Settings as SettingsIcon, Sparkles, BookOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BYOKSection } from './BYOKSection';
import { ModelManagerSection } from './ModelManagerSection';
import { DesktopSyncSection } from './DesktopSyncSection';
import { ReviewReminderSection } from './ReviewReminderSection';
import { ThemeSection } from './ThemeSection';
import { loadSettings, saveSettings, type DesktopSettings } from '@/lib/settings-storage';

type AiProvider = DesktopSettings['aiProvider'];

const PROVIDER_OPTIONS: { value: AiProvider; label: string; description: string }[] = [
  { value: 'rules', label: '규칙 기반 (Rules)', description: '외부 API나 모델 없이 내장 규칙 엔진으로 자동 분류 및 태깅' },
  { value: 'byok', label: '개인 API 키 (BYOK)', description: 'OpenAI, DeepSeek, Anthropic 등의 사용자 API 키 직접 연동' },
  { value: 'local-llm', label: '로컬 AI 모델 (Local LLM)', description: '내 기기에서 직접 llama.cpp 기반으로 모델을 실행하여 추론' },
];

export function SettingsPanel() {
  const [settings, setSettings] = useState<DesktopSettings>(() => loadSettings());

  const handleSettingsChange = useCallback((next: DesktopSettings) => {
    setSettings(next);
    void saveSettings(next);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      {/* Header */}
      <div className="border-b border-border/80 pb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-muted-foreground">
            <SettingsIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">설정</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI 모델, 기기 간 동기화, 복습 알림 및 환경 설정을 관리합니다.
            </p>
          </div>
        </div>
      </div>

      {/* AI Provider Section */}
      <section>
        <div className="mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-app-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            AI 공급자 모드
          </h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            지식 자동 분류, 메타데이터 생성 및 지식 그래프 분석에 사용할 AI 엔진을 선택합니다.
          </p>
          <div className="space-y-2.5">
            {PROVIDER_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all ${
                  settings.aiProvider === opt.value
                    ? 'border-foreground/40 bg-muted/40 shadow-2xs'
                    : 'border-border hover:bg-muted/20'
                }`}
              >
                <input
                  type="radio"
                  name="aiProvider"
                  value={opt.value}
                  checked={settings.aiProvider === opt.value}
                  onChange={() => handleSettingsChange({ ...settings, aiProvider: opt.value })}
                  className="accent-foreground h-4 w-4"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-border/60" />

      {/* BYOK Section */}
      <section>
        <BYOKSection settings={settings} onSettingsChange={handleSettingsChange} />
      </section>

      {/* Divider */}
      <hr className="border-border/60" />

      {/* Local LLM Section */}
      <section>
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

      <hr className="border-border/60" />

      {/* Chat RAG Section */}
      <section>
        <div className="mb-3 flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-app-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            채팅 지식 참조 (RAG)
          </h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">
                채팅에서 저장한 지식 참조 (RAG)
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                대화 시 관련 노트를 자동으로 찾아 답변에 반영합니다. 임베딩 모델이 로드되어 있을 때만 동작합니다.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Label htmlFor="chat-rag-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                {settings.chat.ragEnabled ? '켜짐' : '꺼짐'}
              </Label>
              <Switch
                id="chat-rag-toggle"
                checked={settings.chat.ragEnabled}
                onCheckedChange={(v) =>
                  handleSettingsChange({
                    ...settings,
                    chat: { ...settings.chat, ragEnabled: v },
                  })
                }
              />
            </div>
          </div>
        </div>
      </section>

      <hr className="border-border/60" />

      <DesktopSyncSection />

      <hr className="border-border/60" />

      <ReviewReminderSection />

      <hr className="border-border/60" />

      <ThemeSection />
    </div>
  );
}
