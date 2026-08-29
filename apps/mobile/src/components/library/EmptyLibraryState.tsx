import { Text, View } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';

type EmptyLibraryStateProps = {
  title?: string;
  description?: string;
};

export function EmptyLibraryState({
  title = '비어 있습니다.',
  description,
}: EmptyLibraryStateProps) {
  const appMuted = useSemanticColor('appMuted');

  return (
    <View className="flex-1 items-center justify-center py-24 px-6">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-app-border/40">
        <BookOpen size={24} color={appMuted} />
      </View>
      <Text className="text-base font-semibold text-app-text text-center tracking-tight">
        {title}
      </Text>
      {description ? (
        <Text className="mt-1.5 text-sm text-app-muted text-center leading-relaxed">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
