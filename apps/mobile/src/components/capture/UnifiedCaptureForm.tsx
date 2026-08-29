import { useEffect, useState } from 'react';
import {
  ScrollView,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { X } from 'lucide-react-native';
import { fetchWebMetadata } from '@/src/features/capture/webMetadata';
import { toast } from '@/src/stores/toast.store';
import { logger } from '@/src/utils/logger';
import { useOcrExtraction } from '@/src/hooks/useOcrExtraction';
import { useSemanticColor } from '@glimpse/ui';
import { UnifiedCaptureAssistantBar } from './UnifiedCaptureAssistantBar';

export type UnifiedCaptureFormState = {
  title: string;
  body: string;
  imageUri: string | null;
};

type UnifiedCaptureFormProps = {
  state: UnifiedCaptureFormState;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onChangeImageUri: (uri: string | null) => void;
  bottomInset: number;
};

export function UnifiedCaptureForm({
  state,
  onChangeTitle,
  onChangeBody,
  onChangeImageUri,
  bottomInset,
}: UnifiedCaptureFormProps) {
  const { title, body, imageUri } = state;
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const { ocrState, extract, reset: resetOcr } = useOcrExtraction();
  const appSubtle = useSemanticColor('appSubtle');

  useEffect(() => {
    async function checkClipboard() {
      try {
        const text = await Clipboard.getStringAsync();
        if (text && text.trim().length > 0) {
          setClipboardText(text.trim());
        }
      } catch {
        // ignore clipboard error
      }
    }
    void checkClipboard();
  }, []);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        toast.error('사진 접근 권한이 필요합니다');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        onChangeImageUri(uri);
        await runOcrForImage(uri);
      }
    } catch (error) {
      logger.error('Failed to pick image', error);
      toast.error('이미지를 불러오지 못했습니다');
    }
  };

  const runOcrForImage = async (uri: string) => {
    const text = await extract(uri);
    if (text) {
      if (!body) {
        onChangeBody(text);
      } else {
        onChangeBody(`${body}\n${text}`);
      }
      toast.success('스크린샷에서 텍스트를 추출했습니다');
    }
  };

  const handlePasteClipboard = () => {
    if (!clipboardText) return;
    if (!body) {
      onChangeBody(clipboardText);
      if (/^https?:\/\//i.test(clipboardText)) {
        void handleFetchMetadata(clipboardText);
      }
    } else {
      onChangeBody(`${body}\n${clipboardText}`);
    }
    toast.info('클립보드 내용을 붙여넣었습니다');
  };

  const handleFetchMetadata = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl ?? body).trim();
    if (!urlToFetch || !/^https?:\/\//i.test(urlToFetch)) {
      toast.error('올바른 웹 URL을 입력해주세요');
      return;
    }

    setIsFetchingMetadata(true);
    try {
      const meta = await fetchWebMetadata(urlToFetch);
      if (meta) {
        if (!title && meta.title) {
          onChangeTitle(meta.title);
        }
        toast.success(`웹 정보(${meta.title ?? meta.hostname})를 가져왔습니다`);
      }
    } catch {
      toast.error('웹 정보를 가져오지 못했습니다');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const hasUrl = /^https?:\/\//i.test(body.trim());

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 100,
      }}
      contentInset={{ bottom: bottomInset }}
      keyboardShouldPersistTaps="handled"
    >
      <UnifiedCaptureAssistantBar
        clipboardText={clipboardText}
        hasBody={Boolean(body)}
        hasUrl={hasUrl}
        hasImage={Boolean(imageUri)}
        isFetchingMetadata={isFetchingMetadata}
        ocrRunning={ocrState === 'running'}
        onPasteClipboard={handlePasteClipboard}
        onPickImage={handlePickImage}
        onFetchMetadata={() => handleFetchMetadata()}
      />

      {/* Image Preview if Attached */}
      {imageUri && (
        <View className="relative mb-4">
          <Image
            source={{ uri: imageUri }}
            className="h-48 w-full rounded-md border border-app-border"
            contentFit="contain"
          />
          <Pressable
            onPress={() => {
              onChangeImageUri(null);
              resetOcr();
            }}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 active:bg-black/80"
          >
            <X size={14} color="white" />
          </Pressable>
        </View>
      )}

      {/* Title Input */}
      <TextInput
        className="mb-3 text-2xl font-bold text-app-text tracking-tight"
        value={title}
        onChangeText={onChangeTitle}
        placeholder="제목 없음"
        placeholderTextColor={appSubtle}
        multiline={false}
      />

      {/* Body Input */}
      <View className="min-h-[200px]">
        <TextInput
          className="text-base leading-6 text-app-text"
          value={body}
          onChangeText={onChangeBody}
          placeholder="자유롭게 생각이나 링크, 메모를 기록하세요..."
          placeholderTextColor={appSubtle}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}
