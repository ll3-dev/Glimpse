import { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, BookmarkPlus, BookmarkCheck } from 'lucide-react-native';
import { Text } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { useSaveKnowledgeItemMutation } from '@/src/hooks';
import { toast } from '@/src/stores/toast.store';

interface ChatMessageActionsProps {
  content: string;
}

export function ChatMessageActions({ content }: ChatMessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const appMuted = useSemanticColor('appMuted');
  const appText = useSemanticColor('appText');
  const { mutate: saveItem, isPending: isSaving } = useSaveKnowledgeItemMutation();

  const handleSaveToKnowledge = () => {
    if (isSaving || saved) return;
    const firstLine = content
      .split('\n')[0]
      .replace(/^[#*-\s]+/, '')
      .trim()
      .slice(0, 40);

    saveItem(
      {
        type: 'note',
        title: firstLine || 'AI 답변 요약',
        body: content,
        tags: ['AI대화'],
      },
      {
        onSuccess: () => {
          setSaved(true);
          toast.success('보관함에 새 메모로 저장되었습니다');
        },
        onError: (error) => {
          toast.error(`저장 실패: ${error.message}`);
        },
      }
    );
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <View className="mt-2.5 pt-2 border-t border-app-border/60 flex-row items-center justify-end gap-1.5">
      <Pressable
        onPress={handleSaveToKnowledge}
        disabled={isSaving}
        className="flex-row items-center rounded-md px-2 py-1 active:bg-app-bg"
        accessibilityLabel="보관함에 저장"
      >
        {saved ? (
          <BookmarkCheck size={12} color={appText} />
        ) : (
          <BookmarkPlus size={12} color={appMuted} />
        )}
        <Text
          className={`ml-1 text-[11px] font-medium ${
            saved ? 'text-app-text font-semibold' : 'text-app-muted'
          }`}
        >
          {saved ? '저장됨' : isSaving ? '저장 중' : '저장'}
        </Text>
      </Pressable>

      <Pressable
        onPress={handleCopy}
        className="flex-row items-center rounded-md px-2 py-1 active:bg-app-bg"
        accessibilityLabel="복사"
      >
        {copied ? (
          <Check size={12} color={appText} />
        ) : (
          <Copy size={12} color={appMuted} />
        )}
        <Text
          className={`ml-1 text-[11px] font-medium ${
            copied ? 'text-app-text font-semibold' : 'text-app-muted'
          }`}
        >
          {copied ? '복사됨' : '복사'}
        </Text>
      </Pressable>
    </View>
  );
}
