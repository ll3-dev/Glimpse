import { Alert, View, Text } from 'react-native';
import { Cpu } from 'lucide-react-native';
import { Switch } from '@glimpse/ui/primitives';
import { SettingsSection } from './SettingsSection';
import type { AppleIntelligenceConfig } from '@/src/features/settings';

type AppleIntelligenceSectionProps = {
  config: AppleIntelligenceConfig;
  onToggle: (value: boolean) => void;
};

export function AppleIntelligenceSection({ config, onToggle }: AppleIntelligenceSectionProps) {
  const footer = config.isCheckingAvailability
    ? 'ⓘ 지원 여부를 확인하고 있습니다'
    : config.isAvailable
      ? 'ⓘ 지원 기기에서 iOS 18.1+ / macOS 15.1+로 사용할 수 있습니다'
      : undefined;
  const disabled = !config.isAvailable || config.isCheckingAvailability;
  const disabledReason = config.isCheckingAvailability
    ? '이 기기의 Apple Intelligence 지원 여부를 확인하고 있습니다.'
    : config.unavailableReason || '현재 기기에서 Apple Intelligence를 사용할 수 없습니다.';

  const handlePress = () => {
    if (disabled) {
      Alert.alert('Apple Intelligence 사용 불가', disabledReason);
      return;
    }

    onToggle(!config.enabled);
  };

  return (
    <SettingsSection
      title="Apple Intelligence"
      icon={<Cpu size={18} color="#787774" />}
      footer={footer}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-app-text">Apple Intelligence 사용</Text>
          <Text className="text-xs text-app-muted mt-0.5">
            온디바이스 AI로 프라이빗하고 빠른 추론을 경험하세요
          </Text>
          {!config.isAvailable && config.unavailableReason && (
            <Text className="text-[10px] text-app-accent font-bold mt-1">
              {config.unavailableReason}
            </Text>
          )}
        </View>
        <Switch
          checked={config.enabled}
          onCheckedChange={handlePress}
          disabled={disabled}
        />
      </View>
    </SettingsSection>
  );
}
