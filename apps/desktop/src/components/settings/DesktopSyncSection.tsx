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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Desktop & Mobile Sync
      </h2>
      <div className="space-y-5 rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">자동 동기화 서버</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              같은 네트워크에서는 mDNS로 찾고, 외부에서는 Tailscale HTTPS 주소로 연결합니다.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
            <Wifi className="h-3.5 w-3.5" />
            {!status ? '확인 중' : status.startupError ? '확인 필요' : '실행 중'}
          </span>
        </div>

        {status && (
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Mobile에 입력할 6자리 코드</p>
                <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.22em] text-foreground">
                  {status.pairingCode}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  약 {Math.max(1, Math.ceil(status.pairingCodeExpiresInSeconds / 60))}분 후 만료
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="페어링 코드 복사"
                  onClick={() => void navigator.clipboard.writeText(status.pairingCode)}
                >
                  <Copy />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="새 페어링 코드"
                  disabled={sync.busy}
                  onClick={() => void sync.rotateCode()}
                >
                  <RefreshCw />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Tailscale 원격 동기화</p>
              <p className="text-xs text-muted-foreground">
                {status?.tailscale.url ?? tailscaleMessage(status)}
              </p>
            </div>
          </div>
          {!status?.tailscale.serveEnabled && (
            <Button
              variant="outline"
              disabled={sync.busy || !status?.tailscale.connected}
              onClick={() => void sync.enableTailscale()}
            >
              연결 활성화
            </Button>
          )}
        </div>

        {status && status.pairedClients.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">페어링된 기기</p>
            {status.pairedClients.map((client) => (
              <div key={client.deviceId} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-chart-2" />
                <span>{client.deviceName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatSeen(client.lastSeenAt)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${client.deviceName} 페어링 해제`}
                  disabled={sync.busy}
                  onClick={() => void sync.forgetClient(client.deviceId)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}

        {(sync.error || status?.startupError) && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
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
