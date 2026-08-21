import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';
import { SettingsSection } from './SettingsSection';
import { useAppLocale, type AppLocale } from '@/src/localization';

export function LanguageSection() {
  const { locale, setLocale, messages } = useAppLocale();
  const appText = useSemanticColor('appText');
  const options: { locale: AppLocale; label: string }[] = [
    { locale: 'ko', label: messages.settings.korean },
    { locale: 'en', label: messages.settings.english },
  ];

  return (
    <SettingsSection
      title={messages.settings.languageTitle}
      footer={messages.settings.languageFooter}
    >
      <View className="gap-2">
        {options.map((option) => {
          const selected = option.locale === locale;
          return (
            <Pressable
              key={option.locale}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              onPress={() => setLocale(option.locale)}
              className={`min-h-11 flex-row items-center justify-between rounded-lg border px-3 py-2 ${
                selected ? 'border-app-text bg-app-bg' : 'border-app-border bg-app-surface'
              }`}
            >
              <Text className="text-sm font-semibold text-app-text">{option.label}</Text>
              {selected && <Check size={16} color={appText} />}
            </Pressable>
          );
        })}
      </View>
    </SettingsSection>
  );
}
