/**
 * MessageEditModal Component
 *
 * Modal for editing message content.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { Message } from '@/src/db';

interface MessageEditModalProps {
  visible: boolean;
  message: Message | null;
  onSave: (messageId: string, content: string) => void;
  onCancel: () => void;
}

export function MessageEditModal({
  visible,
  message,
  onSave,
  onCancel,
}: MessageEditModalProps) {
  const [content, setContent] = useState(message?.content ?? '');

  // Update local state when message changes
  useState(() => {
    if (message) {
      setContent(message.content);
    }
  });

  const handleSave = () => {
    if (message && content.trim()) {
      onSave(message.id, content.trim());
    }
  };

  const handleClose = () => {
    setContent(message?.content ?? '');
    onCancel();
  };

  if (!message) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={handleClose}
        >
          <View
            className="bg-white rounded-t-2xl p-4"
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                메시지 수정
              </Text>
              <TouchableOpacity onPress={handleClose} className="p-2 -mr-2">
                <Text className="text-gray-500">취소</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              className="bg-gray-100 rounded-lg p-3 text-base text-gray-900 min-h-[100px]"
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
              placeholder="메시지 내용"
            />

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
                onPress={handleClose}
              >
                <Text className="text-gray-700 font-medium">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg items-center ${
                  content.trim() ? 'bg-black' : 'bg-gray-300'
                }`}
                onPress={handleSave}
                disabled={!content.trim()}
              >
                <Text className="text-white font-medium">저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
