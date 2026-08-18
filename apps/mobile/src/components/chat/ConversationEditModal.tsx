import { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Input,
  Text,
} from '@glimpse/ui/primitives';
import type { Conversation } from '@glimpse/shared';
import { CHAT_CONVERSATION_ICONS } from './chatConversationIcons';
import { cn } from '@/src/lib/utils';
import { Trash2, X } from 'lucide-react-native';

interface ConversationEditModalProps {
  visible: boolean;
  conversation: Conversation | null;
  onSave: (payload: { title: string; icon: string | null }) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function ConversationEditModal({
  visible,
  conversation,
  onSave,
  onCancel,
  onDelete,
}: ConversationEditModalProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [slideAnim] = useState(() => new Animated.Value(400));

  useEffect(() => {
    if (!conversation) return;
    setTitle(conversation.title ?? '');
    setIcon(conversation.icon ?? null);
  }, [conversation]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim]);

  const animateClose = (callback: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      callback();
    });
  };

  const handleClose = () => {
    animateClose(() => {
      if (conversation) {
        setTitle(conversation.title ?? '');
        setIcon(conversation.icon ?? null);
      }
      onCancel();
    });
  };

  const handleSave = () => {
    onSave({ title: title.trim(), icon });
  };

  const handleDeletePress = () => {
    animateClose(() => {
      onDelete();
    });
  };

  if (!conversation) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          className="flex-1 justify-end bg-black/50"
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={{ transform: [{ translateY: slideAnim }] }}
            className="rounded-t-2xl bg-app-surface p-6 pb-10 shadow-xl border-t border-app-border"
            onStartShouldSetResponder={() => true}
          >
            <View className="mb-4 flex-row items-center justify-between px-1">
              <Text className="text-lg font-bold text-app-text">대화 설정</Text>
              <TouchableOpacity onPress={handleClose} className="h-7 w-7 items-center justify-center rounded-full bg-app-bg">
                <X size={16} color="#787774" />
              </TouchableOpacity>
            </View>

            <View className="mb-5">
              <Text className="mb-1.5 ml-1 text-[10px] font-bold uppercase tracking-wider text-app-muted">제목</Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="새 대화"
                className="h-11 rounded-md border-app-border bg-app-bg px-4 py-0 text-sm font-medium"
                textAlignVertical="center"
              />
            </View>

            <View className="mb-8">
              <Text className="mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-app-muted">아이콘</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  className={cn(
                    "h-10 w-10 items-center justify-center rounded-md border",
                    icon === null ? "border-app-text bg-app-text" : "border-app-border bg-app-bg"
                  )}
                  onPress={() => setIcon(null)}
                >
                  <Text className={cn("text-[10px] font-semibold uppercase", icon === null ? "text-white" : "text-app-muted")}>기본</Text>
                </TouchableOpacity>
                {CHAT_CONVERSATION_ICONS.map((candidate) => (
                  <TouchableOpacity
                    key={candidate}
                    className={cn(
                      "h-10 w-10 items-center justify-center rounded-md border",
                      icon === candidate ? "border-app-text bg-app-surface shadow-xs" : "border-app-border bg-app-bg"
                    )}
                    onPress={() => setIcon(candidate)}
                  >
                    <Text className="text-base">{candidate}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <Button 
                variant="ghost" 
                className="flex-1 h-11 rounded-md active:bg-app-accent/10" 
                onPress={handleDeletePress}
              >
                <Trash2 size={14} color="#eb5757" className="mr-1" />
                <Text className="text-xs font-semibold text-app-accent">삭제</Text>
              </Button>
              <Button variant="default" className="flex-[3] h-11 rounded-md" onPress={handleSave} disabled={!title.trim()}>
                <Text className="text-sm font-bold text-white">저장하기</Text>
              </Button>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
