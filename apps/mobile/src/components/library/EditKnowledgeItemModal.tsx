import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import type { KnowledgeItem } from '@glimpse/shared';
import { useUpdateKnowledgeItemMutation } from '@/src/hooks';
import { toast } from '@/src/stores/toast.store';
import { useSemanticColor } from '@glimpse/ui';

interface EditKnowledgeItemModalProps {
  visible: boolean;
  item: KnowledgeItem | null;
  onClose: () => void;
}

export function EditKnowledgeItemModal({
  visible,
  item,
  onClose,
}: EditKnowledgeItemModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [lastItem, setLastItem] = useState<KnowledgeItem | null>(item);
  const appMuted = useSemanticColor('appMuted');
  const appSubtle = useSemanticColor('appSubtle');
  const appBg = useSemanticColor('appBg');

  const { mutate: updateItem, isPending } = useUpdateKnowledgeItemMutation();

  // prop→state 동기화를 effect 대신 렌더 중 상태 조정으로 처리
  // (react-hooks/set-state-in-effect — cascading render 회피)
  if (item !== lastItem) {
    setLastItem(item);
    if (item) {
      setTitle(item.title || '');
      setBody(item.body || '');
      setTagsText(item.tags ? item.tags.join(', ') : '');
    }
  }

  if (!item) return null;

  const handleSave = () => {
    if (isPending) return;

    const parsedTags = tagsText
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    updateItem(
      {
        itemId: item.id,
        patch: {
          title: title.trim() || null,
          body: body.trim() || null,
          tags: parsedTags.length > 0 ? parsedTags : null,
          updatedAt: Date.now(),
        },
      },
      {
        onSuccess: () => {
          onClose();
          toast.success('기록이 수정되었습니다');
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-app-surface rounded-t-2xl max-h-[85%] overflow-hidden border-t border-app-border">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface">
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-app-bg border border-app-border active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <X size={16} color={appMuted} />
            </Pressable>
            <Text className="text-base font-bold text-app-text tracking-tight">기록 수정</Text>
            <Pressable
              onPress={handleSave}
              disabled={isPending}
              className="flex-row items-center bg-app-text px-3.5 py-2 rounded-full active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="저장"
            >
              <Check size={13} color={appBg} />
              <Text className="ml-1.5 text-xs font-semibold text-app-bg">
                {isPending ? '저장 중' : '저장'}
              </Text>
            </Pressable>
          </View>

          <ScrollView className="p-6">
            {/* Title Input */}
            <Text className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-2">
              제목
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력하세요..."
              placeholderTextColor={appSubtle}
              className="bg-app-surface border border-app-border rounded-lg px-3.5 py-2.5 text-sm text-app-text mb-5 font-medium"
            />

            {/* Body Input */}
            <Text className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-2">
              내용
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="내용을 입력하세요..."
              placeholderTextColor={appSubtle}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="bg-app-surface border border-app-border rounded-lg px-3.5 py-2.5 text-sm text-app-text mb-5 min-h-[140px] leading-relaxed"
            />

            {/* Tags Input */}
            <Text className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-2">
              태그 (쉼표로 구분)
            </Text>
            <TextInput
              value={tagsText}
              onChangeText={setTagsText}
              placeholder="예: 아이디어, 독서, 업무"
              placeholderTextColor={appSubtle}
              className="bg-app-surface border border-app-border rounded-lg px-3.5 py-2.5 text-sm text-app-text mb-8"
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
