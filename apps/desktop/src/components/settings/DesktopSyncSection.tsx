import { CheckCircle2, Copy, RefreshCw, ShieldCheck, Trash2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDesktopSyncStatus } from '@/features/sync/use-desktop-sync-status';

function formatSeen(value: number | null): string {
  if (!value) return '아직 동기화하지 않음';
  return `마지막 연결 ${new Date(value).toLocaleString('ko-KR')}`;
}

export function DesktopSyncSection() {
  const sync = useDesktopSyncStatus();
  const status = sync.status;

  return (
    <section>
      <div className="mb-3 flex items-center gap-1.5">
        <Wifi className="h-4 w-4 text-app-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          기기 간 자동 동기화 (Sync)
        </h2>
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">자동 동기화 서버</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              동일 Wi-Fi 네트워크에서는 mDNS로 자동 검색하며, 외부에서는 Tailscale 보안 연결로 동기화합니다.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
            <span
              className={`h-2 w-2 rounded-full ${
                !status ? 'bg-muted-foreground' : status.startupError ? 'bg-destructive' : 'bg-green-500'
              }`}
            />
            {!status ? '확인 중' : status.startupError ? '오류' : '실행 중'}
          </span>
        </div>

        {status && (
          <div className="rounded-xl border border-border/80 bg-background/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">모바일 앱에 입력할 6자리 페어링 코드</p>
                <p className="mt-1.5 font-mono text-3xl font-bold tracking-[0.25em] text-foreground">
                  {status.pairingCode}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  약 {Math.max(1, Math.ceil(status.pairingCodeExpiresInSeconds / 60))}분 후 자동 만료
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="페어링 코드 복사"
                  className="rounded-xl"
                  onClick={() => void navigator.clipboard.writeText(status.pairingCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="새 페어링 코드 생성"
                  disabled={sync.busy}
                  className="rounded-xl"
                  onClick={() => void sync.rotateCode()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-app-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Tailscale 원격 보안 동기화</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {status?.tailscale.url ?? tailscaleMessage(status)}
              </p>
            </div>
          </div>
          {!status?.tailscale.serveEnabled && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shrink-0"
              disabled={sync.busy || !status?.tailscale.connected}
              onClick={() => void sync.enableTailscale()}
            >
              연결 활성화
            </Button>
          )}
        </div>

        {status && status.pairedClients.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              페어링된 기기 ({status.pairedClients.length})
            </p>
            <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-background/50">
              {status.pairedClients.map((client) => (
                <div key={client.deviceId} className="flex items-center gap-3 p-3 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="font-medium">{client.deviceName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatSeen(client.lastSeenAt)}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`${client.deviceName} 페어링 해제`}
                    disabled={sync.busy}
                    onClick={() => void sync.forgetClient(client.deviceId)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(sync.error || status?.startupError) && (
          <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
            {sync.error ?? status?.startupError}
          </p>
        )}
      </div>
    </section>
  );
}

function tailscaleMessage(status: ReturnType<typeof useDesktopSyncStatus>['status']): string {
  if (!status) return '상태 확인 중…';
  if (!status.tailscale.installed) return 'Tailscale 설치가 필요합니다.';
  if (!status.tailscale.connected) return 'Tailscale에 먼저 로그인해 주세요.';
  return '활성화 후 Desktop 앱이 실행 중일 때 원격 자동 동기화에 사용합니다.';
}
