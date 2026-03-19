import { View, Text } from 'react-native';
import { Share2 } from '@glimpse/ui/icons';

type ShareStubProps = {
  bottomInset: number;
};

export function ShareStub({ bottomInset }: ShareStubProps) {
  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ paddingBottom: bottomInset + 100 }}
    >
      <View className="mb-6 rounded-full bg-muted p-6">
        <Share2 size={48} className="text-muted-foreground" />
      </View>
      <Text className="mb-2 text-xl font-semibold text-app-text">
        공유로 받기
      </Text>
      <Text className="mb-8 text-base text-center text-muted-foreground">
        다른 앱에서 공유 버튼을 눌러{'\n'}Glimpse로 내용을 보내세요
      </Text>
      <View className="rounded-lg px-6 py-4 bg-muted">
        <Text className="text-sm text-center text-muted-foreground">
          OS 공유 시트에서 Glimpse 선택
        </Text>
      </View>
      <Text className="mt-4 text-sm text-muted-foreground">
        (MVP v1에서는 준비 중)
      </Text>
    </View>
  );
}
