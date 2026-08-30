import { useState, useRef } from 'react';
import {
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
} from 'react-native';
import { Button, Text, Textarea } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import type { Message } from '@glimpse/shared';
import { X } from 'lucide-react-native';

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
  const [lastMessage, setLastMessage] = useState<Message | null>(message);
  const textareaRef = useRef<TextInput>(null);
  const appMuted = useSemanticColor('appMuted');

  // prop→state 동기화를 effect 대신 렌더 중 상태 조정으로 처리
  // (react-hooks/set-state-in-effect — cascading render 회피)
  if (visible && message !== lastMessage) {
    setLastMessage(message);
    if (message) {
      setContent(message.content);
    }
  }

  const handleSave = () => {
    if (message && content.trim()) {
      onSave(message.id, content.trim());
    }
  };

  const handleClose = () => {
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
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={handleClose}
        >
          <View
            className="rounded-t-2xl bg-app-surface p-6 pb-10 shadow-xl border-t border-app-border"
            onStartShouldSetResponder={() => true}
          >
            <View className="mb-4 flex-row items-center justify-between px-1">
              <Text className="text-lg font-bold text-app-text">메시지 수정</Text>
              <Pressable onPress={handleClose} className="h-7 w-7 items-center justify-center rounded-full bg-app-bg">
                <X size={16} color={appMuted} />
              </Pressable>
            </View>

            <View className="mb-6 h-40">
              <Textarea
                ref={textareaRef}
                className="flex-1 rounded-md border-app-border bg-app-bg px-4 py-3 text-sm leading-6 text-app-text"
                value={content}
                onChangeText={setContent}
                placeholder="내용을 입력하세요..."
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row gap-3">
              <Button variant="outline" className="flex-1 h-11 rounded-md border-app-border" onPress={handleClose}>
                <Text className="text-xs font-semibold text-app-muted">취소</Text>
              </Button>
              <Button 
                variant="default" 
                className="flex-[2] h-11 rounded-md" 
                onPress={handleSave} 
                disabled={!content.trim() || content.trim() === message.content}
              >
                <Text className="text-sm font-bold text-app-bg">수정 완료</Text>
              </Button>
            </View>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
