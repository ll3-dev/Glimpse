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
import { CollectForm, CollectTopBar } from '@/src/components/collect';
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
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    if (!body.trim()) {
      Alert.alert('입력 오류', '본문을 입력해주세요.');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const result = await saveKnowledgeItem({
        type: 'note',
        title: title.trim() || undefined,
        body: body.trim(),
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
      setTitle('');
      setBody('');
      Alert.alert('저장 완료', '메모가 저장되었습니다.');
    } catch (error) {
      logger.error('CollectScreen.handleSave failed', error);
      Alert.alert('저장 실패', '저장 중 예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
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
        <CollectForm
          title={title}
          body={body}
          bottomInset={insets.bottom}
          onChangeTitle={setTitle}
          onChangeBody={setBody}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
