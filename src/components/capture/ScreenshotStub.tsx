import { View, Text, Pressable } from 'react-native';
import { ImagePlus } from '@/src/ui/icons';

type ScreenshotStubProps = {
  bottomInset: number;
};

export function ScreenshotStub({ bottomInset }: ScreenshotStubProps) {
  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ paddingBottom: bottomInset + 100 }}
    >
      <View className="mb-6 rounded-full bg-muted p-6">
        <ImagePlus size={48} className="text-muted-foreground" />
      </View>
      <Text className="mb-2 text-xl font-semibold text-app-text">
        스크린샷 캡처
      </Text>
      <Text className="mb-8 text-base text-center text-muted-foreground">
        스크린샷을 선택하면 OCR로 텍스트를 추출합니다
      </Text>
      <Pressable className="rounded-full px-6 py-3 bg-foreground active:opacity-80">
        <Text className="text-base font-medium text-background">
          이미지 선택
        </Text>
      </Pressable>
      <Text className="mt-4 text-sm text-muted-foreground">
        (MVP v1에서는 준비 중)
      </Text>
    </View>
  );
}
