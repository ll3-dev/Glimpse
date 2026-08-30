import { useEffect, useState } from 'react';
import { View, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveKnowledgeItemMutation } from '@/src/hooks';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { X } from '@glimpse/ui/icons';
import {
  CaptureSaveButton,
  UnifiedCaptureForm,
  type UnifiedCaptureFormState,
} from '@/src/components/capture';
import { ScreenHeader } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { shareIntentToFormState } from '@/src/features/capture/form/intent-to-form';
import { toast } from '@/src/stores/toast.store';
import type { KnowledgeItemType } from '@glimpse/shared';

export default function CaptureScreen() {
  const [formState, setFormState] = useState<UnifiedCaptureFormState>({
    title: '',
    body: '',
    imageUri: null,
  });
  const { mutate: saveItem, isPending } = useSaveKnowledgeItemMutation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appText = useSemanticColor('appText');
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  // 공유 인텐트(외부 공유 → 캡처 진입) 내용을 폼에 프리필한다.
  // 적용을 먼저 하고 인텐트를 리셋해 연속 공유도 누락되지 않는다.
  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;
    const patch = shareIntentToFormState({
      text: shareIntent.text ?? null,
      webUrl: shareIntent.webUrl ?? null,
      title: shareIntent.meta?.title ?? null,
      files: shareIntent.files ?? null,
    });
    if (Object.keys(patch).length > 0) {
      // 외부 시스템(share-intent provider)의 일회성 이벤트를 폼 상태로 동기화하는
      // 정당한 케이스. useCaptureFormState의 apply_share_intent와 동일한 패턴.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormState((prev) => ({ ...prev, ...patch }));
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  const handleSave = () => {
    if (isPending) return;

    const trimmedTitle = formState.title.trim();
    const trimmedBody = formState.body.trim();

    if (!trimmedTitle && !trimmedBody && !formState.imageUri) {
      Alert.alert('입력 필요', '내용이나 제목을 입력해주세요.');
      return;
    }

    // Smart type detection
    let type: KnowledgeItemType = 'note';
    let url: string | undefined = undefined;

    if (formState.imageUri) {
      type = 'screenshot';
    } else if (/^https?:\/\/\S+$/i.test(trimmedBody)) {
      type = 'link';
      url = trimmedBody;
    }

    if (type === 'link') {
      saveItem(
        {
          type: 'link',
          title: trimmedTitle || null,
          body: trimmedBody,
          url: url ?? trimmedBody,
        },
        {
          onSuccess: () => {
            toast.success('기록이 저장되었습니다');
            router.back();
          },
          onError: (error) => {
            Alert.alert('저장 실패', error.message);
          },
        },
      );
      return;
    }

    saveItem(
      {
        type,
        title: trimmedTitle || null,
        body: trimmedBody,
      },
      {
        onSuccess: () => {
          toast.success('기록이 저장되었습니다');
          router.back();
        },
        onError: (error) => {
          Alert.alert('저장 실패', error.message);
        },
      },
    );
  };

  return (
    <View 
      className="flex-1 bg-app-bg" 
      style={{ 
        paddingTop: Platform.OS === 'ios' ? 8 : insets.top 
      }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="새 기록"
          leftElement={
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-app-border/40"
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <X size={22} color={appText} />
            </Pressable>
          }
          rightElement={
            <CaptureSaveButton isSaving={isPending} onPress={handleSave} />
          }
        />
        <UnifiedCaptureForm
          state={formState}
          onChangeTitle={(title) => setFormState((prev) => ({ ...prev, title }))}
          onChangeBody={(body) => setFormState((prev) => ({ ...prev, body }))}
          onChangeImageUri={(imageUri) => setFormState((prev) => ({ ...prev, imageUri }))}
          bottomInset={insets.bottom}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
