import { ScrollView, TextInput, View } from 'react-native';

type CollectFormProps = {
  title: string;
  body: string;
  bottomInset: number;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
};

export function CollectForm({
  title,
  body,
  bottomInset,
  onChangeTitle,
  onChangeBody,
}: CollectFormProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 32,
        paddingTop: 20,
        paddingBottom: bottomInset + 100,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        className="mb-6 text-4xl font-bold text-app-text"
        value={title}
        onChangeText={onChangeTitle}
        placeholder="제목 없음"
        placeholderTextColor="#d3d2d1"
        multiline={false}
      />

      <View className="min-h-[400px]">
        <TextInput
          className="text-xl leading-8 text-app-text"
          value={body}
          onChangeText={onChangeBody}
          placeholder="자유롭게 기록하세요..."
          placeholderTextColor="#d3d2d1"
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}
