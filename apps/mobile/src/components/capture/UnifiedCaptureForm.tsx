import { useEffect, useState } from 'react';
import {
  ScrollView,
  TextInput,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { ImagePlus, X, Clipboard as ClipboardIcon, Globe } from 'lucide-react-native';
import { fetchWebMetadata } from '@/src/features/capture/webMetadata';
import { toast } from '@/src/stores/toast.store';
import { logger } from '@/src/utils/logger';
import { useOcrExtraction } from '@/src/hooks/useOcrExtraction';

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
      // OCR 텍스트를 본문에 자동 삽입 — 사용자가 이어서 편집할 수 있다.
      if (!body) {
        onChangeBody(text);
      } else {
        onChangeBody(`${body}\n${text}`);
      }
      toast.success('스크린샷에서 텍스트를 추출했습니다');
    }
    // no_text/error는 조용히 넘긴다 — 텍스트 없는 스크린샷도 유효한 저장이고
    // 에러 toast는 매 선택마다 과도하다. 사용자는 본문이 비었음을 바로 본다.
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
      {/* Quick Assistant Bar */}
      <View className="mb-4 flex-row flex-wrap items-center gap-2">
        {clipboardText && !body && (
          <Pressable
            onPress={handlePasteClipboard}
            className="flex-row items-center rounded-md border border-app-border bg-app-surface px-2.5 py-1.5 active:bg-app-bg"
          >
            <ClipboardIcon size={12} color="#787774" className="mr-1.5" />
            <Text className="text-xs font-medium text-app-muted">
              클립보드 붙여넣기
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handlePickImage}
          className="flex-row items-center rounded-md border border-app-border bg-app-surface px-2.5 py-1.5 active:bg-app-bg"
        >
          <ImagePlus size={12} color="#787774" className="mr-1.5" />
          <Text className="text-xs font-medium text-app-muted">
            {imageUri ? '사진 변경' : '사진 첨부'}
          </Text>
        </Pressable>

        {hasUrl && (
          <Pressable
            onPress={() => handleFetchMetadata()}
            disabled={isFetchingMetadata}
            className="flex-row items-center rounded-md border border-app-border bg-app-surface px-2.5 py-1.5 active:bg-app-bg"
          >
            {isFetchingMetadata ? (
              <ActivityIndicator size="small" color="#2383e2" className="mr-1.5" />
            ) : (
              <Globe size={12} color="#2383e2" className="mr-1.5" />
            )}
            <Text className="text-xs font-medium text-app-primary">
              {isFetchingMetadata ? '가져오는 중...' : '웹 제목 자동 추출'}
            </Text>
          </Pressable>
        )}

        {ocrState === 'running' && (
          <View className="flex-row items-center rounded-md border border-app-border bg-app-surface px-2.5 py-1.5">
            <ActivityIndicator size="small" color="#787774" className="mr-1.5" />
            <Text className="text-xs font-medium text-app-muted">
              텍스트 인식 중...
            </Text>
          </View>
        )}
      </View>

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
        placeholderTextColor="#9b9a97"
        multiline={false}
      />

      {/* Body Input */}
      <View className="min-h-100">
        <TextInput
          className="text-base leading-6 text-app-text"
          value={body}
          onChangeText={onChangeBody}
          placeholder="자유롭게 생각이나 링크, 메모를 기록하세요..."
          placeholderTextColor="#9b9a97"
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}
