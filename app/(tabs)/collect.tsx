import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  saveKnowledgeItem,
  type SaveFailureResult,
} from '../../src/features/capture';
import { logger } from '../../src/utils/logger';

export default function CollectScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!body.trim()) {
      Alert.alert('입력 오류', '본문을 입력해주세요.');
      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveKnowledgeItem({
        type: 'note',
        title: title.trim() || undefined,
        body: body.trim(),
      });

      if (!result.success) {
        const failure = result as SaveFailureResult;
        Alert.alert('저장 실패', failure.error.message);
        return;
      }

      logger.debug('[CollectScreen] Note saved:', result.data);

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
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            className="mb-4 text-3xl font-bold text-gray-900"
            value={title}
            onChangeText={setTitle}
            placeholder="제목 없음"
            placeholderTextColor="#9ca3af"
            multiline={false}
          />

          <View className="mb-8 min-h-[300px]">
            <TextInput
              className="text-lg leading-7 text-gray-800"
              value={body}
              onChangeText={setBody}
              placeholder="여기에 내용을 입력하세요..."
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </View>

          <TouchableOpacity
            className={`items-center rounded-lg bg-blue-600 py-3 ${isSaving ? 'opacity-60' : ''}`}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <Text className="text-base font-semibold text-white">
              {isSaving ? '저장 중...' : '저장하기'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
