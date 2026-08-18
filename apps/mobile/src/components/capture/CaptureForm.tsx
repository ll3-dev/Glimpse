import { ScrollView, TextInput, View } from 'react-native';

type CaptureFormProps = {
  title: string;
  body: string;
  bottomInset: number;
  placeholder?: string;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
};

export function CaptureForm({
  title,
  body,
  bottomInset,
  placeholder = '자유롭게 기록하세요...',
  onChangeTitle,
  onChangeBody,
}: CaptureFormProps) {
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
      <TextInput
        className="mb-4 text-3xl font-bold text-app-text"
        value={title}
        onChangeText={onChangeTitle}
        placeholder="제목 없음"
        placeholderTextColor="#9b9a97"
        multiline={false}
      />

      <View className="min-h-100">
        <TextInput
          className="text-lg leading-7 text-app-text"
          value={body}
          onChangeText={onChangeBody}
          placeholder={placeholder}
          placeholderTextColor="#9b9a97"
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}
