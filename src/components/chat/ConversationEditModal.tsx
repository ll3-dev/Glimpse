import { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
} from '@/src/ui/primitives';
import type { Conversation } from '@/src/db';
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
  const slideAnim = useRef(new Animated.Value(400)).current;

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
    Alert.alert(
      "대화를 삭제할까요?",
      "이 대화의 모든 메시지가 영구적으로 삭제되며 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "삭제하기", 
          style: "destructive", 
          onPress: () => onDelete() 
        }
      ]
    );
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
            className="rounded-t-[32px] bg-app-surface p-6 pb-10 shadow-2xl"
            onStartShouldSetResponder={() => true}
          >
            <View className="mb-4 flex-row items-center justify-between px-1">
              <Text className="text-lg font-bold text-app-text">대화 설정</Text>
              <TouchableOpacity onPress={handleClose} className="h-7 w-7 items-center justify-center rounded-full bg-app-bg">
                <X size={16} color="#9b9a97" />
              </TouchableOpacity>
            </View>

            <View className="mb-5">
              <Text className="mb-1.5 ml-1 text-[10px] font-bold uppercase tracking-wider text-app-subtle">제목</Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="새 대화"
                className="h-11 rounded-2xl border-app-border bg-app-bg px-4 py-0 text-sm font-medium"
                textAlignVertical="center"
              />
            </View>

            <View className="mb-8">
              <Text className="mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-app-subtle">아이콘</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  className={cn(
                    "h-11 w-11 items-center justify-center rounded-2xl border",
                    icon === null ? "border-app-primary bg-app-primary" : "border-app-border bg-app-bg"
                  )}
                  onPress={() => setIcon(null)}
                >
                  <Text className={cn("text-[8px] font-black uppercase", icon === null ? "text-white" : "text-app-subtle")}>기본</Text>
                </TouchableOpacity>
                {CHAT_CONVERSATION_ICONS.map((candidate) => (
                  <TouchableOpacity
                    key={candidate}
                    className={cn(
                      "h-11 w-11 items-center justify-center rounded-2xl border",
                      icon === candidate ? "border-app-primary bg-app-surface shadow-sm" : "border-app-border bg-app-bg"
                    )}
                    onPress={() => setIcon(candidate)}
                  >
                    <Text className="text-lg">{candidate}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <Button 
                variant="ghost" 
                className="flex-1 h-11 rounded-2xl active:bg-app-accent/5" 
                onPress={handleDeletePress}
              >
                <Trash2 size={14} className="text-app-accent/50 mr-1" />
                <Text className="text-xs font-bold text-app-accent/50">삭제</Text>
              </Button>
              <Button variant="default" className="flex-[3] h-11 rounded-2xl" onPress={handleSave} disabled={!title.trim()}>
                <Text className="text-sm font-bold text-white">저장하기</Text>
              </Button>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
