import { ActivityIndicator, Pressable, Switch as NativeSwitch, Text, TextInput, View } from 'react-native';
import { Check, MonitorSmartphone, RefreshCw, Search, Unplug } from 'lucide-react-native';
import { Button, Text as ButtonText } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { discoveryBaseUrl } from '@/src/features/sync';
import { useDesktopSyncSettings } from '@/src/hooks';
import { SettingsSection } from './SettingsSection';

function formatLastSync(value: number | null): string {
  if (!value) return '아직 동기화하지 않았습니다';
  return `마지막 동기화 ${new Date(value).toLocaleString('ko-KR')}`;
}

export function DesktopSyncSection() {
  const sync = useDesktopSyncSettings();
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const paired = Boolean(sync.config.desktopDeviceId);
  const busy = ['discovering', 'pairing', 'syncing'].includes(sync.runtime.status);

  return (
    <SettingsSection
      title="Desktop 동기화"
      icon={<MonitorSmartphone size={18} color={appMuted} />}
      footer="같은 Wi-Fi에서는 자동 탐색하고, Tailscale에서는 페어링된 MagicDNS 주소로 다시 연결합니다."
    >
      {paired ? (
        <View className="gap-4">
          <View className="flex-row items-start gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-app-bg border border-app-border">
              <Check size={17} color={appText} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-app-text">
                {sync.config.desktopDeviceName ?? 'Glimpse Desktop'}
              </Text>
              <Text className="mt-0.5 text-xs text-app-muted">
                {formatLastSync(sync.config.lastSyncedAt)}
              </Text>
              {sync.config.tailscaleUrl && (
                <Text className="mt-1 text-[11px] text-app-subtle" numberOfLines={1}>
                  {sync.config.tailscaleUrl}
                </Text>
              )}
            </View>
          </View>

          <View className="h-px bg-app-border" />
          <View className="min-h-11 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold text-app-text">자동 동기화</Text>
              <Text className="text-xs text-app-muted">앱 실행·복귀 및 백그라운드 기회에 실행</Text>
            </View>
            <NativeSwitch value={sync.config.autoSync} onValueChange={sync.setAutoSync} />
          </View>

          {sync.runtime.error && (
            <Text className="rounded-lg bg-app-bg border border-app-border px-3 py-2 text-xs text-app-accent">
              {sync.runtime.error}
            </Text>
          )}

          <View className="flex-row gap-2">
            <Button
              className="flex-1 flex-row gap-2"
              disabled={busy}
              onPress={() => void sync.syncNow().catch(() => undefined)}
            >
              {sync.runtime.status === 'syncing' ? (
                <ActivityIndicator size="small" color={appMuted} />
              ) : (
                <RefreshCw size={16} color={appMuted} />
              )}
              <ButtonText>지금 동기화</ButtonText>
            </Button>
            <Button
              variant="outline"
              className="flex-row gap-2"
              disabled={busy}
              onPress={() => void sync.unpair().catch(() => undefined)}
            >
              <Unplug size={16} color={appMuted} />
              <ButtonText>해제</ButtonText>
            </Button>
          </View>
        </View>
      ) : (
        <View className="gap-3">
          <View className="flex-row items-center gap-3">
            <MonitorSmartphone size={20} color={appMuted} />
            <Text className="flex-1 text-xs leading-5 text-app-muted">
              Desktop 설정의 6자리 코드를 사용해 한 번만 페어링하세요.
            </Text>
          </View>

          <Button
            variant="outline"
            className="flex-row gap-2"
            disabled={busy}
            onPress={() => void sync.discover().catch(() => undefined)}
          >
            {sync.runtime.status === 'discovering' ? (
              <ActivityIndicator size="small" color={appMuted} />
            ) : (
              <Search size={16} color={appMuted} />
            )}
            <ButtonText>같은 네트워크에서 찾기</ButtonText>
          </Button>

          {sync.runtime.discovered.map((desktop) => {
            const url = discoveryBaseUrl(desktop);
            const selected = sync.address === url;
            return (
              <Pressable
                key={desktop.deviceId ?? url}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => sync.selectDesktop(url)}
                className={`min-h-11 rounded-lg border px-3.5 py-2 ${selected ? 'border-app-text bg-app-bg' : 'border-transparent bg-app-bg/50'}`}
              >
                <Text className="text-sm font-semibold text-app-text">{desktop.name}</Text>
                <Text className="text-[11px] text-app-muted">{url}</Text>
              </Pressable>
            );
          })}

          <TextInput
            accessibilityLabel="Desktop 또는 Tailscale 주소"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={sync.address}
            onChangeText={sync.setAddress}
            placeholder="https://desktop.tailnet.ts.net"
            placeholderTextColor={appMuted}
            className="min-h-11 rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-text"
          />
          <TextInput
            accessibilityLabel="6자리 페어링 코드"
            keyboardType="number-pad"
            maxLength={6}
            value={sync.pairingCode}
            onChangeText={sync.setPairingCode}
            placeholder="000000"
            placeholderTextColor={appMuted}
            className="min-h-11 rounded-md border border-app-border bg-app-surface px-3 text-center text-lg font-semibold tracking-[6px] text-app-text"
          />

          {sync.runtime.error && (
            <Text className="rounded-lg bg-app-bg border border-app-border px-3 py-2 text-xs text-app-accent">
              {sync.runtime.error}
            </Text>
          )}

          <Button
            disabled={busy || !sync.address || sync.pairingCode.length !== 6}
            onPress={() => void sync.pair().catch(() => undefined)}
          >
            {sync.runtime.status === 'pairing' ? <ActivityIndicator size="small" /> : <ButtonText>페어링하고 동기화</ButtonText>}
          </Button>
        </View>
      )}
    </SettingsSection>
  );
}
