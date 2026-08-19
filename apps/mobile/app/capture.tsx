import { useState } from 'react';
import { View, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveKnowledgeItemMutation } from '@/src/hooks';
import { useRouter } from 'expo-router';
import { X } from '@glimpse/ui/icons';
import {
  CaptureSaveButton,
  UnifiedCaptureForm,
  type UnifiedCaptureFormState,
} from '@/src/components/capture';
import { ScreenHeader } from '@glimpse/ui/primitives';
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

    saveItem(
      {
        type,
        title: trimmedTitle || (type === 'link' ? url : undefined),
        body: trimmedBody || (formState.imageUri ? '스크린샷 기록' : ''),
        url,
      },
      {
        onSuccess: () => {
          toast.success('기록이 저장되었습니다');
          router.back();
        },
        onError: (error) => {
          Alert.alert('저장 실패', error.message);
        },
      }
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
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <X size={24} color="#37352f" />
            </TouchableOpacity>
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
