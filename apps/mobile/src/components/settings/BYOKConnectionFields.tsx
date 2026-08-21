import { View } from 'react-native';
import { Button, Input, Text } from '@glimpse/ui/primitives';

type BYOKConnectionFieldsProps = {
  baseUrl: string;
  model: string;
  onBaseUrlChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSave: () => void;
};

export function BYOKConnectionFields({
  baseUrl,
  model,
  onBaseUrlChange,
  onModelChange,
  onSave,
}: BYOKConnectionFieldsProps) {
  return (
    <>
      <View className="mb-4">
        <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
          연결 설정
        </Text>
        <Input
          accessibilityLabel="Base URL"
          className="mb-2"
          placeholder="Base URL (OpenAI에서만 override 적용)"
          value={baseUrl}
          onChangeText={onBaseUrlChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          accessibilityLabel="AI 모델 이름"
          placeholder="Model (예: gpt-4o-mini)"
          value={model}
          onChangeText={onModelChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Button onPress={onSave} variant="outline" className="mb-4">
        <Text>연결 설정 저장</Text>
      </Button>
    </>
  );
}
