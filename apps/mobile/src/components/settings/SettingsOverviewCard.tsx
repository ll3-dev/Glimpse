import { View } from 'react-native';
import { Bot, Cpu, Key, Sparkles, ShieldCheck } from 'lucide-react-native';
import { Card, Text, Badge } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { useAppLocale } from '@/src/localization';
import {
  useAppleIntelligenceConfig,
  useLocalLLMEnabled,
  useLocalLLMReady,
  useSelectedLocalModel,
  useBYOKConfig,
  useBYOKReady,
} from '@/src/features/settings';

export function SettingsOverviewCard() {
  const { messages } = useAppLocale();
  const appleConfig = useAppleIntelligenceConfig();
  const localLLMEnabled = useLocalLLMEnabled();
  const localLLMReady = useLocalLLMReady();
  const selectedLocalModel = useSelectedLocalModel();
  const byokConfig = useBYOKConfig((config) => config);
  const byokReady = useBYOKReady();

  const appPrimary = useSemanticColor('appPrimary');
  const appMuted = useSemanticColor('appMuted');

  // Determine active profile — catalog messages are literal-typed per locale,
  // so widen to string or reassignment from another branch fails typecheck.
  let title: string = messages.settings.aiOverviewRules;
  let description: string = messages.settings.aiOverviewRulesDesc;
  let badgeText = 'Lightweight';
  let badgeVariant: 'default' | 'secondary' | 'outline' = 'secondary';
  let icon = <Sparkles size={20} color={appPrimary} />;

  if (appleConfig.enabled && appleConfig.isAvailable) {
    title = messages.settings.aiOverviewApple;
    description = messages.settings.aiOverviewAppleDesc;
    badgeText = 'On-Device';
    badgeVariant = 'default';
    icon = <Cpu size={20} color={appPrimary} />;
  } else if (localLLMEnabled && localLLMReady && selectedLocalModel) {
    title = `${messages.settings.aiOverviewLocal} (${selectedLocalModel.name})`;
    description = messages.settings.aiOverviewLocalDesc;
    badgeText = 'Offline';
    badgeVariant = 'secondary';
    icon = <Bot size={20} color={appPrimary} />;
  } else if (byokConfig.enabled && byokReady && byokConfig.provider) {
    const providerName = byokConfig.provider.toUpperCase();
    title = `${messages.settings.aiOverviewByok} (${providerName})`;
    description = messages.settings.aiOverviewByokDesc(providerName);
    badgeText = 'Cloud API';
    badgeVariant = 'outline';
    icon = <Key size={20} color={appPrimary} />;
  }

  return (
    <Card className="mb-6 p-4 rounded-2xl border border-app-border bg-app-surface">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-9 h-9 rounded-xl bg-app-bg items-center justify-center border border-app-border/60">
            {icon}
          </View>
          <View>
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
              {messages.settings.aiOverviewTitle}
            </Text>
            <Text className="text-sm font-bold text-app-text tracking-tight">
              {title}
            </Text>
          </View>
        </View>
        <Badge variant={badgeVariant} className="px-2 py-0.5">
          <Text className="text-[11px] font-medium">{badgeText}</Text>
        </Badge>
      </View>

      <Text className="text-xs text-app-muted leading-relaxed pl-11">
        {description}
      </Text>

      <View className="mt-3 pt-2.5 border-t border-app-border/60 flex-row items-center gap-1.5 pl-11">
        <ShieldCheck size={13} color={appMuted} />
        <Text className="text-[11px] text-app-subtle font-medium">
          {appleConfig.enabled || (localLLMEnabled && localLLMReady)
            ? '기기 내 보안 영역에서 안전하게 처리됩니다'
            : '설정한 모드에 따라 안전하고 투명하게 실행됩니다'}
        </Text>
      </View>
    </Card>
  );
}
