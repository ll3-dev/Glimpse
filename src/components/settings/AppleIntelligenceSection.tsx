import { View, Text } from 'react-native';
import { Cpu } from 'lucide-react-native';
import { Switch } from '@/src/ui/primitives';
import { SettingsSection } from './SettingsSection';
import type { AppleIntelligenceConfig } from '@/src/features/settings';

type AppleIntelligenceSectionProps = {
  config: AppleIntelligenceConfig;
  onToggle: (value: boolean) => void;
};

export function AppleIntelligenceSection({ config, onToggle }: AppleIntelligenceSectionProps) {
  return (
    <SettingsSection
      title="Apple Intelligence"
      icon={<Cpu size={18} color="#787774" />}
      footer={
        config.isAvailable
          ? "ⓘ iOS 18.1+ / macOS 15.1+에서 사용할 수 있습니다"
          : undefined
      }
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-app-text">Apple Intelligence 사용</Text>
          <Text className="text-xs text-app-muted mt-0.5">
            온디바이스 AI로 프라이빗하고 빠른 추론을 경험하세요
          </Text>
          {!config.isAvailable && (
            <Text className="text-[10px] text-app-accent font-bold mt-1 uppercase">
              {config.unavailableReason}
            </Text>
          )}
        </View>
        <Switch
          checked={config.enabled}
          onCheckedChange={onToggle}
          disabled={!config.isAvailable}
        />
      </View>
    </SettingsSection>
  );
}
