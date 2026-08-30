import { Pressable, Text, View } from 'react-native';
import { Check, Monitor, Moon, Sun } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';
import { SettingsSection } from './SettingsSection';
import { useThemePreference, useThemePreferenceActions } from '@/src/stores/settings/theme.store';
import { useColorScheme } from '@/src/lib/useColorScheme';
import { useAppLocale, type AppMessages } from '@/src/localization';

type ThemeOption = {
  value: 'system' | 'light' | 'dark';
  label: (messages: AppMessages) => string;
  icon: React.ComponentType<{ size: number; color: string }>;
};

const OPTIONS: ThemeOption[] = [
  { value: 'system', label: (m) => m.settings.themeSystem, icon: Monitor },
  { value: 'light', label: (m) => m.settings.themeLight, icon: Sun },
  { value: 'dark', label: (m) => m.settings.themeDark, icon: Moon },
];

/** 시스템/라이트/다크 테마 선택 — 적용·영속은 theme.store가 담당한다. */
export function ThemeSection() {
  const { messages } = useAppLocale();
  const preference = useThemePreference((value) => value);
  const { setPreference } = useThemePreferenceActions();
  const { isDarkColorScheme } = useColorScheme();
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const appPrimary = useSemanticColor('appPrimary');

  return (
    <SettingsSection
      title={messages.settings.themeTitle}
      icon={<Sun size={18} color={appMuted} />}
      footer={messages.settings.themeFooter}
    >
      <View className="gap-2">
        {OPTIONS.map((option) => {
          const selected = option.value === preference;
          const Icon = option.icon;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label(messages)}
              accessibilityState={{ checked: selected }}
              onPress={() => setPreference(option.value)}
              className={`min-h-11 flex-row items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                selected ? 'border-app-text bg-app-bg' : 'border-transparent bg-app-bg/40'
              }`}
            >
              <View className="flex-row items-center">
                <Icon size={16} color={selected ? appPrimary : appMuted} />
                <Text className="ml-2.5 text-sm font-semibold text-app-text">
                  {option.label(messages)}
                </Text>
                {option.value === 'system' && (
                  <Text className="ml-2 text-xs text-app-subtle">
                    {isDarkColorScheme
                      ? messages.settings.themeCurrentlyDark
                      : messages.settings.themeCurrentlyLight}
                  </Text>
                )}
              </View>
              {selected && <Check size={16} color={appText} />}
            </Pressable>
          );
        })}
      </View>
    </SettingsSection>
  );
}
