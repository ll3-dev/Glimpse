import { useState, useEffect } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Effect } from 'effect';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShareIntentContext } from 'expo-share-intent';
import {
  saveKnowledgeItem,
  type KnowledgeItemInput,
} from '@/src/features/capture';
import {
  CollectForm,
  ChannelSegment,
  HighlightForm,
  ScreenshotForm,
  ShareForm,
  type SharedContent,
} from '@/src/components/collect';
import { KnowledgeItemType } from '@/src/db/schema';
import { logger } from '@/src/utils/logger';
import { appError, isFailure, tryPromise } from '@/src/lib/effect-result';
import { ScreenHeader } from '@/src/ui/primitives';

function formatErrorDetails(details: unknown): string | undefined {
  if (details === null || details === undefined) {
    return undefined;
  }

  if (typeof details === 'string') {
    return details;
  }

  if (details instanceof Error) {
    return details.message;
  }

  return Effect.runSync(
    Effect.try({
      try: () => JSON.stringify(details),
      catch: () => String(details),
    })
  );
}

export default function CollectScreen() {
  const [channel, setChannel] = useState<KnowledgeItemType>('note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [highlightText, setHighlightText] = useState('');
  const [highlightSource, setHighlightSource] = useState('');
  const [screenshotText, setScreenshotText] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [shareBody, setShareBody] = useState('');
  const [sharedContent, setSharedContent] = useState<SharedContent>({});
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // Handle share intent
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      // Switch to share channel
      setChannel('share');

      // Process shared content
      const newSharedContent: SharedContent = {};

      if (shareIntent.text) {
        newSharedContent.text = shareIntent.text;
        setShareBody(shareIntent.text);
      }

      if (shareIntent.webUrl) {
        newSharedContent.url = shareIntent.webUrl;
        setShareTitle(shareIntent.webUrl);
      }

      if (shareIntent.files && shareIntent.files.length > 0) {
        newSharedContent.imageUri = shareIntent.files[0].path;
      }

      setSharedContent(newSharedContent);

      // Reset share intent after processing
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setHighlightText('');
    setHighlightSource('');
    setScreenshotText('');
    setShareTitle('');
    setShareBody('');
    setSharedContent({});
  };

  const handleChannelChange = (newChannel: KnowledgeItemType) => {
    setChannel(newChannel);
    // 채널 변경 시 입력값 초기화
    resetForm();
  };

  const handleSave = async () => {
    if (isSaving) return;

    let saveInput: KnowledgeItemInput;

    switch (channel) {
      case 'note':
        if (!body.trim()) {
          Alert.alert('입력 오류', '본문을 입력해주세요.');
          return;
        }
        saveInput = {
          type: 'note',
          title: title.trim() || undefined,
          body: body.trim(),
        };
        break;

      case 'link':
        if (!body.trim()) {
          Alert.alert('입력 오류', 'URL을 입력해주세요.');
          return;
        }
        saveInput = {
          type: 'link',
          title: title.trim() || undefined,
          url: body.trim(),
        };
        break;

      case 'highlight':
        if (!highlightText.trim()) {
          Alert.alert('입력 오류', '하이라이트 텍스트를 입력해주세요.');
          return;
        }
        saveInput = {
          type: 'highlight',
          title: highlightSource.trim() || undefined,
          body: highlightText.trim(),
        };
        break;

      case 'screenshot':
        if (!screenshotText.trim()) {
          Alert.alert('입력 오류', '이미지를 선택하고 텍스트를 추출해주세요.');
          return;
        }
        saveInput = {
          type: 'screenshot',
          title: title.trim() || undefined,
          body: screenshotText.trim(),
        };
        break;

      case 'share':
        if (!shareBody.trim() && !sharedContent.url && !sharedContent.imageUri) {
          Alert.alert('입력 오류', '공유된 내용이 없습니다.');
          return;
        }
        saveInput = {
          type: 'share',
          title: shareTitle.trim() || sharedContent.url || undefined,
          body: shareBody.trim(),
          url: sharedContent.url,
        };
        break;

      default:
        return;
    }

    setIsSaving(true);

    const program = Effect.gen(function* () {
      const result = yield* tryPromise(
        () => saveKnowledgeItem(saveInput),
        (error) => appError('UNKNOWN_ERROR', 'CollectScreen.handleSave failed', error)
      );

      if (isFailure(result)) {
        const details = formatErrorDetails(result.error.details);
        logger.error(
          'CollectScreen.handleSave failed (SaveFailureResult)',
          details ?? result.error.message,
          {
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
          }
        );
        Alert.alert('저장 실패', result.error.message);
        return;
      }

      yield* tryPromise(
        () => queryClient.invalidateQueries({ queryKey: ['knowledgeItems'] }),
        (error) => appError('UNKNOWN_ERROR', 'CollectScreen.handleSave failed', error)
      );
      resetForm();
      Alert.alert('저장 완료', '저장되었습니다.');
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error('CollectScreen.handleSave failed', error);
          Alert.alert('저장 실패', '저장 중 예상치 못한 오류가 발생했습니다.');
        })
      ),
      Effect.ensuring(
        Effect.sync(() => {
          setIsSaving(false);
        })
      )
    );

    await Effect.runPromise(program);
  };

  const renderForm = () => {
    switch (channel) {
      case 'note':
      case 'link':
        return (
          <CollectForm
            title={title}
            body={body}
            bottomInset={insets.bottom}
            onChangeTitle={setTitle}
            onChangeBody={setBody}
            placeholder={channel === 'link' ? 'URL을 입력하세요...' : '자유롭게 기록하세요...'}
          />
        );

      case 'highlight':
        return (
          <HighlightForm
            text={highlightText}
            source={highlightSource}
            bottomInset={insets.bottom}
            onChangeText={setHighlightText}
            onChangeSource={setHighlightSource}
          />
        );

      case 'screenshot':
        return (
          <ScreenshotForm
            extractedText={screenshotText}
            onChangeExtractedText={setScreenshotText}
            bottomInset={insets.bottom}
          />
        );

      case 'share':
        return (
          <ShareForm
            sharedContent={sharedContent}
            editedTitle={shareTitle}
            editedBody={shareBody}
            bottomInset={insets.bottom}
            onChangeTitle={setShareTitle}
            onChangeBody={setShareBody}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View
      className="flex-1 bg-app-bg"
      style={{ paddingTop: insets.top }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="수집"
          subtitle="새로운 지식 기록하기"
          rightElement={
            <TouchableOpacity
              className={`px-4 py-2 rounded-md bg-app-primary ${isSaving ? 'opacity-30' : ''}`}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-sm">저장</Text>
            </TouchableOpacity>
          }
        />
        <ChannelSegment value={channel} onChange={handleChannelChange} />
        {renderForm()}
      </KeyboardAvoidingView>
    </View>
  );
}
