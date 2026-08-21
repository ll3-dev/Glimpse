import { useState } from 'react';
import { Effect } from 'effect';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
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
      }
    });

    await Effect.runPromise(program).catch((error) => {
      logger.error('Failed to pick screenshot image', error);
    });
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
        paddingBottom: 100,
      }}
      contentInset={{ bottom: bottomInset }}
      keyboardShouldPersistTaps="handled"
    >
      {!selectedImage ? (
        <Pressable
          onPress={pickImage}
          className="min-h-40 items-center justify-center rounded-md border-2 border-dashed border-app-border bg-app-surface active:opacity-80"
        >
          <View className="items-center">
            <ImagePlus size={32} color="#787774" className="mb-2" />
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
              contentFit="contain"
            />
            <Pressable
              onPress={clearImage}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1"
            >
              <X size={14} color="white" />
            </Pressable>
          </View>
        </View>
      )}

      <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-tight text-app-muted">
        추출된 텍스트 / 메모
      </Text>
      <View className="min-h-37.5 rounded-md border border-app-border bg-app-surface p-4">
        <TextInput
          className="text-base leading-6 text-app-text"
          value={extractedText}
          onChangeText={onChangeExtractedText}
          placeholder={
            selectedImage
              ? '스크린샷에 관한 메모나 텍스트를 입력하세요.'
              : '이미지를 선택하거나 메모를 입력하세요...'
          }
          placeholderTextColor="#9b9a97"
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </View>

      {selectedImage && (
        <Pressable
          onPress={pickImage}
          className="mt-4 items-center justify-center rounded-md border border-app-border bg-app-surface py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-app-muted">
            다른 이미지 선택
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
