import { ScrollView, TextInput, View, Text } from 'react-native';

type HighlightFormProps = {
  text: string;
  source: string;
  bottomInset: number;
  onChangeText: (value: string) => void;
  onChangeSource: (value: string) => void;
};

export function HighlightForm({
  text,
  source,
  bottomInset,
  onChangeText,
  onChangeSource,
}: HighlightFormProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 24, // px-6
        paddingTop: 20,
        paddingBottom: bottomInset + 100,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="mb-2 text-sm font-semibold text-app-muted">
        하이라이트 텍스트
      </Text>
      <View className="min-h-[160px] mb-6 rounded-md border border-app-border bg-white p-4">
        <TextInput
          className="text-lg leading-7 text-app-text"
          value={text}
          onChangeText={onChangeText}
          placeholder="발췌한 구절을 입력하세요..."
          placeholderTextColor="#d3d2d1"
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </View>

      <Text className="mb-2 text-sm font-semibold text-app-muted">
        출처 (선택)
      </Text>
      <View className="flex-row items-center rounded-md border border-app-border bg-white px-4 mb-4">
        <TextInput
          className="flex-1 py-3 text-base text-app-text"
          value={source}
          onChangeText={onChangeSource}
          placeholder="책 제목, URL 등..."
          placeholderTextColor="#d3d2d1"
          multiline={false}
        />
      </View>
    </ScrollView>
  );
}
