import { View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveKnowledgeItemMutation } from '@/src/hooks';
import {
  ChannelSegment,
  CollectChannelForm,
  CollectSaveButton,
  useCollectFormState,
} from '@/src/components/collect';
import { ScreenHeader } from '@/src/ui/primitives';

export default function CollectScreen() {
  const { channel, setChannel, state, actions, resetForm, buildSaveInput } =
    useCollectFormState();
  const { mutate: saveItem, isPending } = useSaveKnowledgeItemMutation();
  const insets = useSafeAreaInsets();

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
        Alert.alert('저장 완료', '저장되었습니다.');
      },
      onError: (error) => {
        Alert.alert('저장 실패', error.message);
      },
    });
  };

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="수집"
          subtitle="새로운 지식 기록하기"
          rightElement={
            <CollectSaveButton isSaving={isPending} onPress={handleSave} />
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
