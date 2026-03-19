import { useState } from 'react';
import { Effect } from 'effect';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { appError, tryPromise } from '@/src/lib/effect-result';
import { logger } from '@/src/utils/logger';
import { ImagePlus, X } from '@glimpse/ui/icons';

type ScreenshotFormProps = {
  extractedText: string;
  onChangeExtractedText: (value: string) => void;
  bottomInset: number;
};

export function ScreenshotForm({
  extractedText,
  onChangeExtractedText,
  bottomInset,
}: ScreenshotFormProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImage = async () => {
    const program = Effect.gen(function* () {
      const permission = yield* tryPromise(
        () => ImagePicker.requestMediaLibraryPermissionsAsync(),
        (error) => appError('UNKNOWN_ERROR', 'Failed to request media permission', error)
      );

      if (permission.status !== 'granted') {
        return;
      }

      const result = yield* tryPromise(
        () =>
          ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          }),
        (error) => appError('UNKNOWN_ERROR', 'Failed to open image picker', error)
      );

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
        yield* tryPromise(
          () => processImage(uri),
          (error) => appError('UNKNOWN_ERROR', 'Failed to process image', error)
        );
      }
    });

    await Effect.runPromise(program).catch((error) => {
      logger.error('Failed to pick screenshot image', error);
    });
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    const program = Effect.sync(() => {
      const stubText = `[OCR 스텁]\n\n이미지에서 추출된 텍스트가 여기에 표시됩니다.\n\n현재는 MVP 단계로, 실제 OCR 기능은 추후 구현 예정입니다.\n\n이미지 URI: ${uri.split('/').pop()}`;
      onChangeExtractedText(stubText);
    }).pipe(
      Effect.delay(1000),
      Effect.ensuring(
        Effect.sync(() => {
          setIsProcessing(false);
        })
      )
    );

    await Effect.runPromise(program);
  };

  const clearImage = () => {
    setSelectedImage(null);
    onChangeExtractedText('');
  };

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
      {!selectedImage ? (
        <Pressable
          onPress={pickImage}
          className="min-h-40 items-center justify-center rounded-md border-2 border-dashed border-app-border bg-white"
        >
          <View className="items-center">
            <ImagePlus size={32} className="mb-2 text-app-muted" />
            <Text className="text-sm font-semibold text-app-muted">
              스크린샷 선택
            </Text>
          </View>
        </Pressable>
      ) : (
        <View className="mb-4">
          <View className="relative">
            <Image
              source={{ uri: selectedImage }}
              className="h-50 w-full rounded-md"
              resizeMode="contain"
            />
            <Pressable
              onPress={clearImage}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1"
            >
              <X size={14} className="text-white" />
            </Pressable>
            {isProcessing && (
              <View className="absolute inset-0 items-center justify-center rounded-md bg-black/40">
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="mt-2 text-xs text-white">
                  텍스트 추출 중...
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <Text className="mb-2 mt-4 text-sm font-semibold text-app-muted">
        추출된 텍스트
      </Text>
      <View className="min-h-37.5 rounded-md border border-app-border bg-white p-4">
        <TextInput
          className="text-base leading-6 text-app-text"
          value={extractedText}
          onChangeText={onChangeExtractedText}
          placeholder="이미지를 선택하면 텍스트가 추출됩니다..."
          placeholderTextColor="#d3d2d1"
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
          editable={!isProcessing}
        />
      </View>

      {selectedImage && !isProcessing && (
        <Pressable
          onPress={pickImage}
          className="mt-4 items-center justify-center rounded-md border border-app-border bg-white py-3"
        >
          <Text className="text-sm font-semibold text-app-muted">
            다른 이미지 선택
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
