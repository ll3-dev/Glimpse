import { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Effect } from 'effect';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveKnowledgeItem } from '@/src/features/capture';
import {
  ChannelSegment,
  CollectChannelForm,
  CollectSaveButton,
  useCollectFormState,
} from '@/src/components/collect';
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
  const {
    channel,
    setChannel,
    state,
    actions,
    resetForm,
    buildSaveInput,
  } = useCollectFormState();
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    const nextSaveInput = buildSaveInput();
    if ('errorMessage' in nextSaveInput) {
      Alert.alert('입력 오류', nextSaveInput.errorMessage);
      return;
    }

    setIsSaving(true);

    const program = Effect.gen(function* () {
      const result = yield* tryPromise(
        () => saveKnowledgeItem(nextSaveInput.input),
        (error) =>
          appError("UNKNOWN_ERROR", "CollectScreen.handleSave failed", error),
      );

      if (isFailure(result)) {
        const details = formatErrorDetails(result.error.details);
        logger.error(
          "CollectScreen.handleSave failed (SaveFailureResult)",
          details ?? result.error.message,
          {
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
          },
        );
        Alert.alert("저장 실패", result.error.message);
        return;
      }

      yield* tryPromise(
        () => queryClient.invalidateQueries({ queryKey: ["knowledgeItems"] }),
        (error) =>
          appError("UNKNOWN_ERROR", "CollectScreen.handleSave failed", error),
      );
      resetForm();
      Alert.alert("저장 완료", "저장되었습니다.");
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error("CollectScreen.handleSave failed", error);
          Alert.alert("저장 실패", "저장 중 예상치 못한 오류가 발생했습니다.");
        }),
      ),
      Effect.ensuring(Effect.sync(() => setIsSaving(false))),
    );

    await Effect.runPromise(program);
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
            <CollectSaveButton isSaving={isSaving} onPress={handleSave} />
          }
        />
        <ChannelSegment value={channel} onChange={setChannel} />
        <CollectChannelForm
          channel={channel}
          bottomInset={insets.bottom}
          state={state}
          actions={actions}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
