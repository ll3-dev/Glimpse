import { View, Text, Switch } from 'react-native';
import { Cpu } from 'lucide-react-native';
import { Card } from '@/src/ui/primitives';
import type { AppleIntelligenceConfig } from '@/src/features/settings';

type AppleIntelligenceSectionProps = {
  config: AppleIntelligenceConfig;
  onToggle: (value: boolean) => void;
};

export function AppleIntelligenceSection({ config, onToggle }: AppleIntelligenceSectionProps) {
  return (
    <View className="mb-8">
      <View className="flex-row items-center mb-3">
        <Cpu size={18} color="#787774" />
        <Text className="ml-2 text-sm font-bold text-app-muted uppercase tracking-tight">
          Apple Intelligence
        </Text>
      </View>

      <Card className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-base font-semibold text-app-text">Apple Intelligence 사용</Text>
            <Text className="text-xs text-app-muted mt-0.5">
              온디바이스 AI로 프라이빗하고 빠른 추론을 경험하세요
            </Text>
            {!config.isAvailable && (
              <Text className="text-[10px] text-red-500 font-bold mt-1 uppercase">
                {config.unavailableReason}
              </Text>
            )}
          </View>
          <Switch
            value={config.enabled}
            onValueChange={onToggle}
            disabled={!config.isAvailable}
            trackColor={{ false: '#e5e5e5', true: '#2383e2' }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      {config.isAvailable && (
        <Text className="mt-2 text-[10px] text-app-subtle font-medium text-center">
          ⓘ iOS 18.1+ / macOS 15.1+에서 사용할 수 있습니다
        </Text>
      )}
    </View>
  );
}
