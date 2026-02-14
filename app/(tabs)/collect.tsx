import { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  saveKnowledgeItem,
  type SaveFailureResult,
} from '@/src/features/capture';
import {
  CollectForm,
  CollectTopBar,
  ChannelSegment,
  HighlightForm,
  ScreenshotStub,
  ShareStub,
} from '@/src/components/collect';
import { KnowledgeItemType } from '@/src/db/schema';
import { logger } from '@/src/utils/logger';

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

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export default function CollectScreen() {
  const [channel, setChannel] = useState<KnowledgeItemType>('note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [highlightText, setHighlightText] = useState('');
  const [highlightSource, setHighlightSource] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const resetForm = () => {
    setTitle('');
    setBody('');
    setHighlightText('');
    setHighlightSource('');
  };

  const handleChannelChange = (newChannel: KnowledgeItemType) => {
    setChannel(newChannel);
    // 채널 변경 시 입력값 초기화
    resetForm();
  };

  const handleSave = async () => {
    if (isSaving) return;

    let saveType: KnowledgeItemType;
    let saveTitle: string | undefined;
    let saveBody: string | undefined;

    switch (channel) {
      case 'note':
        if (!body.trim()) {
          Alert.alert('입력 오류', '본문을 입력해주세요.');
          return;
        }
        saveType = 'note';
        saveTitle = title.trim() || undefined;
        saveBody = body.trim();
        break;

      case 'link':
        if (!body.trim()) {
          Alert.alert('입력 오류', 'URL을 입력해주세요.');
          return;
        }
        saveType = 'link';
        saveTitle = title.trim() || undefined;
        saveBody = body.trim();
        break;

      case 'highlight':
        if (!highlightText.trim()) {
          Alert.alert('입력 오류', '하이라이트 텍스트를 입력해주세요.');
          return;
        }
        saveType = 'highlight';
        saveTitle = highlightSource.trim() || undefined;
        saveBody = highlightText.trim();
        break;

      case 'screenshot':
      case 'share':
        Alert.alert('알림', '이 채널은 MVP v1에서 준비 중입니다.');
        return;

      default:
        return;
    }

    setIsSaving(true);

    try {
      const result = await saveKnowledgeItem({
        type: saveType,
        title: saveTitle,
        body: saveBody,
      });

      if (!result.success) {
        const failure = result as SaveFailureResult;
        const details = formatErrorDetails(failure.error.details);
        logger.error('CollectScreen.handleSave failed (SaveFailureResult)', details ?? failure.error.message, {
          code: failure.error.code,
          message: failure.error.message,
          details: failure.error.details,
        });
        Alert.alert('저장 실패', failure.error.message);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['knowledgeItems'] });
      resetForm();
      Alert.alert('저장 완료', '저장되었습니다.');
    } catch (error) {
      logger.error('CollectScreen.handleSave failed', error);
      Alert.alert('저장 실패', '저장 중 예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
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
        return <ScreenshotStub bottomInset={insets.bottom} />;

      case 'share':
        return <ShareStub bottomInset={insets.bottom} />;

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
        <CollectTopBar isSaving={isSaving} onSave={handleSave} />
        <ChannelSegment value={channel} onChange={handleChannelChange} />
        {renderForm()}
      </KeyboardAvoidingView>
    </View>
  );
}
