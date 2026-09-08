import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  detectLocalServers,
  type DetectedLocalServer,
} from '@/features/ai/providers/local-server-detect';
import { createLocalServerProvider } from '@/features/ai/providers/local-server-provider';
import type { DesktopSettings } from '@/lib/settings-storage';

interface LocalServerSectionProps {
  settings: DesktopSettings;
  onSettingsChange: (next: DesktopSettings) => void;
}

/**
 * 외부 로컬 서버 설정 — 자동 감지 우선, 수동 URL은 탈출구.
 *
 * 감지 결과는 항상 원클릭("이 모델 사용")으로만 적용한다. 같은 포트를 쓰는
 * 다른 서비스와의 오탐을 자동 적용으로 흡수하지 않기 위해서다.
 */
export function LocalServerSection({ settings, onSettingsChange }: LocalServerSectionProps) {
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectedLocalServer[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const runDetection = useCallback(async () => {
    setDetecting(true);
    try {
      setDetected(await detectLocalServers());
    } finally {
      setDetecting(false);
    }
  }, []);

  // 섹션 진입 시 자동 감지 — 설정 화면을 열면 실행 중인 로컬 서버를 찾는다.
  // 이펙트 본문에서 동기 setState를 피하기 위해 매크로태스크로 이연한다.
  useEffect(() => {
    const timer = setTimeout(() => void runDetection(), 0);
    return () => clearTimeout(timer);
  }, [runDetection]);

  const applyServer = (server: DetectedLocalServer, model: string) => {
    onSettingsChange({
      ...settings,
      aiProvider: 'local-server',
      localServer: {
        baseUrl: server.baseUrl,
        model,
        detectedFrom: server.serverId,
      },
    });
    setTestResult(null);
  };

  const updateManual = (patch: Partial<DesktopSettings['localServer']>) => {
    onSettingsChange({
      ...settings,
      localServer: { ...settings.localServer, ...patch, detectedFrom: 'manual' },
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const provider = createLocalServerProvider({
        baseUrl: settings.localServer.baseUrl,
        model: settings.localServer.model,
      });
      const response = await provider.complete({ prompt: 'ping', maxTokens: 1 });
      setTestResult({
        ok: true,
        message: response.text ? '연결 성공' : '연결 성공 (빈 응답)',
      });
    } catch (error) {
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        LM Studio·Ollama·llama.cpp/mlx-lm 등이 여는 OpenAI 호환 엔드포인트를 사용합니다.
        모든 추론은 내 컴퓨터에서만 일어납니다.
      </p>

      {/* 자동 감지 */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground">로컬 서버 감지</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void runDetection()}
            disabled={detecting}
          >
            {detecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            다시 감지
          </Button>
        </div>

        {detected.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            {detecting
              ? '감지 중…'
              : '실행 중인 로컬 서버를 찾지 못했습니다. LM Studio·Ollama를 시작하거나 아래에 주소를 입력하세요.'}
          </p>
        ) : (
          <div className="space-y-2">
            {detected.map((server) => (
              <div key={server.baseUrl} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-app-primary" />
                      {server.label} 발견
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {server.baseUrl} · 모델 {server.models.length}개
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => applyServer(server, server.models[0])}
                  >
                    이 모델 사용
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {server.models.slice(0, 4).map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => applyServer(server, model)}
                      className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                      title={`${model} 사용`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 수동 입력 — 감지되지 않는 포트/커스텀 서버용 */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="local-server-url" className="text-xs font-semibold text-foreground">
            서버 주소 (Base URL)
          </Label>
          <Input
            id="local-server-url"
            value={settings.localServer.baseUrl}
            onChange={(e) => updateManual({ baseUrl: e.target.value })}
            placeholder="http://localhost:1234"
            className="mt-1.5 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div>
          <Label htmlFor="local-server-model" className="text-xs font-semibold text-foreground">
            모델 이름 (비우면 서버 기본 모델)
          </Label>
          <Input
            id="local-server-model"
            value={settings.localServer.model}
            onChange={(e) => updateManual({ model: e.target.value })}
            placeholder="예: qwen3-8b"
            className="mt-1.5 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleTestConnection()}
            disabled={testing || !settings.localServer.baseUrl.trim()}
          >
            {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            연결 테스트
          </Button>
          {testResult && (
            <p
              className={`text-xs ${testResult.ok ? 'text-app-primary' : 'text-red-600'}`}
              role="status"
            >
              {testResult.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
