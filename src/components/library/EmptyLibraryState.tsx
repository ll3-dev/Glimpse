import { Text, View } from 'react-native';

type EmptyLibraryStateProps = {
  title?: string;
  description?: string;
};

export function EmptyLibraryState({
  title = '비어 있습니다.',
  description,
}: EmptyLibraryStateProps) {
  return (
    <View className="flex-1 items-center justify-center pt-32">
      <Text className="text-app-subtle text-base font-medium">{title}</Text>
      {description ? (
        <Text className="mt-2 text-app-muted text-sm text-center">{description}</Text>
      ) : null}
    </View>
  );
}
