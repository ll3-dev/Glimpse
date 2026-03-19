import { View, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveKnowledgeItemMutation } from '@/src/hooks';
import { useRouter } from 'expo-router';
import { X } from '@glimpse/ui/icons';
import {
  ChannelSegment,
  CaptureChannelForm,
  CaptureSaveButton,
  useCaptureFormState,
} from '@/src/components/capture';
import { ScreenHeader } from '@glimpse/ui/primitives';

export default function CaptureScreen() {
  const { channel, setChannel, state, actions, resetForm, buildSaveInput } =
    useCaptureFormState();
  const { mutate: saveItem, isPending } = useSaveKnowledgeItemMutation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSave = () => {
    if (isPending) return;

    const nextSaveInput = buildSaveInput();
    if ('errorMessage' in nextSaveInput) {
      Alert.alert('입력 오류', nextSaveInput.errorMessage);
      return;
    }

    saveItem(nextSaveInput.input, {
      onSuccess: () => {
        resetForm();
        Alert.alert('저장 완료', '저장되었습니다.', [
          { text: '확인', onPress: () => router.back() }
        ]);
      },
      onError: (error) => {
        Alert.alert('저장 실패', error.message);
      },
    });
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
          title="새로운 기록"
          leftElement={
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <X size={24} color="#37352f" />
            </TouchableOpacity>
          }
          rightElement={
            <CaptureSaveButton isSaving={isPending} onPress={handleSave} />
          }
        />
        <ChannelSegment value={channel} onChange={setChannel} />
        <CaptureChannelForm
          channel={channel}
          bottomInset={insets.bottom}
          state={state}
          actions={actions}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
