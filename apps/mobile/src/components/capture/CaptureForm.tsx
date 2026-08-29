import { useEffect, useState } from 'react';
import {
  ScrollView,
  TextInput,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Clipboard as ClipboardIcon, Globe } from 'lucide-react-native';
import { fetchWebMetadata } from '@/src/features/capture/webMetadata';
import { toast } from '@/src/stores/toast.store';
import { useSemanticColor } from '@glimpse/ui';
import type { KnowledgeItemType } from '@glimpse/shared';

type CaptureFormProps = {
  channel?: KnowledgeItemType;
  title: string;
  body: string;
  bottomInset: number;
  placeholder?: string;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
};

export function CaptureForm({
  channel = 'note',
  title,
  body,
  bottomInset,
  placeholder = '자유롭게 기록하세요...',
  onChangeTitle,
  onChangeBody,
}: CaptureFormProps) {
  const [clipboardContent, setClipboardContent] = useState<string | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const appMuted = useSemanticColor('appMuted');
  const appPrimary = useSemanticColor('appPrimary');
  const appSubtle = useSemanticColor('appSubtle');

  // Check clipboard on mount
  useEffect(() => {
    async function checkClipboard() {
      try {
        const text = await Clipboard.getStringAsync();
        if (text && text.trim().length > 0) {
          setClipboardContent(text.trim());
        }
      } catch {
        // ignore clipboard error
      }
    }
    void checkClipboard();
  }, []);

  const handlePasteClipboard = () => {
    if (!clipboardContent) return;

    if (channel === 'link' || /^https?:\/\//i.test(clipboardContent)) {
      onChangeBody(clipboardContent);
      void handleFetchMetadata(clipboardContent);
    } else {
      if (!body) {
        onChangeBody(clipboardContent);
      } else {
        onChangeBody(`${body}\n${clipboardContent}`);
      }
    }
    toast.info('클립보드 내용을 붙여넣었습니다');
  };

  const handleFetchMetadata = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl ?? body).trim();
    if (!urlToFetch || !/^https?:\/\//i.test(urlToFetch)) {
      toast.error('올바른 웹 URL(http:// 또는 https://)을 입력해주세요');
      return;
    }

    setIsFetchingMetadata(true);
    try {
      const meta = await fetchWebMetadata(urlToFetch);
      if (meta) {
        if (!title && meta.title) {
          onChangeTitle(meta.title);
        }
        toast.success(`웹페이지 정보("${meta.title ?? meta.hostname}")를 가져왔습니다`);
      }
    } catch {
      toast.error('웹 정보를 가져오지 못했습니다');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const isLink = channel === 'link' || /^https?:\/\//i.test(body.trim());

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 24, // px-6
        paddingTop: 16,
        paddingBottom: 100,
      }}
      contentInset={{ bottom: bottomInset }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Quick Assistant Bar (Clipboard / Link fetch) */}
      <View className="mb-4 flex-row flex-wrap items-center gap-2">
        {clipboardContent && !body && (
          <Pressable
            onPress={handlePasteClipboard}
            className="flex-row items-center rounded-md border border-app-border bg-app-surface px-2.5 py-1.5 active:bg-app-bg"
          >
            <ClipboardIcon size={12} color={appMuted} className="mr-1.5" />
            <Text className="text-xs font-medium text-app-muted" numberOfLines={1}>
              클립보드 붙여넣기
            </Text>
          </Pressable>
        )}

        {isLink && body.trim().length > 0 && (
          <Pressable
            onPress={() => handleFetchMetadata()}
            disabled={isFetchingMetadata}
            className="flex-row items-center rounded-md border border-app-border bg-app-surface px-2.5 py-1.5 active:bg-app-bg"
          >
            {isFetchingMetadata ? (
              <ActivityIndicator size="small" color={appPrimary} className="mr-1.5" />
            ) : (
              <Globe size={12} color={appPrimary} className="mr-1.5" />
            )}
            <Text className="text-xs font-medium text-app-primary">
              {isFetchingMetadata ? '가져오는 중...' : '웹 제목 자동 추출'}
            </Text>
          </Pressable>
        )}
      </View>

      <TextInput
        className="mb-3 text-2xl font-bold text-app-text tracking-tight"
        value={title}
        onChangeText={onChangeTitle}
        placeholder={isLink ? '링크 제목 (선택)' : '제목 없음'}
        placeholderTextColor={appSubtle}
        multiline={false}
      />

      <View className="min-h-[200px]">
        <TextInput
          className="text-base leading-6 text-app-text"
          value={body}
          onChangeText={onChangeBody}
          placeholder={placeholder}
          placeholderTextColor={appSubtle}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
          autoCapitalize={isLink ? 'none' : 'sentences'}
          autoCorrect={!isLink}
        />
      </View>
    </ScrollView>
  );
}
