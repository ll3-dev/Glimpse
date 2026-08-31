import { Pressable, View } from 'react-native';
import { Cpu, Key, Sparkles, Check } from 'lucide-react-native';
import { Text, Badge } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { useAppLocale } from '@/src/localization';

export type AIMode = 'auto' | 'on-device' | 'cloud';

type AIModeSelectorProps = {
  selectedMode: AIMode;
  onSelectMode: (mode: AIMode) => void;
};

export function AIModeSelector({ selectedMode, onSelectMode }: AIModeSelectorProps) {
  const { messages } = useAppLocale();
  const appPrimary = useSemanticColor('appPrimary');
  const appMuted = useSemanticColor('appMuted');
  const appSurface = useSemanticColor('appSurface');

  const modes: {
    id: AIMode;
    title: string;
    description: string;
    badge?: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'auto',
      title: messages.settings.aiModeSmart,
      description: messages.settings.aiModeSmartDesc,
      badge: messages.settings.recommendedBadge,
      icon: <Sparkles size={18} color={selectedMode === 'auto' ? appPrimary : appMuted} />,
    },
    {
      id: 'on-device',
      title: messages.settings.aiModeOnDevice,
      description: messages.settings.aiModeOnDeviceDesc,
      icon: <Cpu size={18} color={selectedMode === 'on-device' ? appPrimary : appMuted} />,
    },
    {
      id: 'cloud',
      title: messages.settings.aiModeCloud,
      description: messages.settings.aiModeCloudDesc,
      icon: <Key size={18} color={selectedMode === 'cloud' ? appPrimary : appMuted} />,
    },
  ];

  return (
    <View className="gap-2.5 mb-4">
      {modes.map((mode) => {
        const isSelected = selectedMode === mode.id;
        return (
          <Pressable
            key={mode.id}
            accessibilityRole="radio"
            accessibilityLabel={mode.title}
            accessibilityState={{ checked: isSelected }}
            onPress={() => onSelectMode(mode.id)}
            className={`min-h-14 p-3.5 rounded-xl border active:opacity-80 ${
              isSelected
                ? 'border-app-text bg-app-bg'
                : 'border-app-border bg-app-surface'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <View className="p-1 rounded-md bg-app-bg/50">
                  {mode.icon}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-app-text">
                      {mode.title}
                    </Text>
                    {mode.badge && (
                      <Badge variant="default" className="px-1.5 py-0">
                        <Text className="text-[9px] font-semibold">{mode.badge}</Text>
                      </Badge>
                    )}
                  </View>
                  <Text className="text-xs text-app-muted mt-0.5 leading-4">
                    {mode.description}
                  </Text>
                </View>
              </View>

              <View
                className={`w-5 h-5 rounded-full items-center justify-center border ${
                  isSelected
                    ? 'border-app-text bg-app-text'
                    : 'border-app-border bg-transparent'
                }`}
              >
                {isSelected && <Check size={12} color={appSurface} />}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
