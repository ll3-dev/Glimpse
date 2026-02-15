import { View, ScrollView, Pressable, Text } from 'react-native';
import { KnowledgeItemType } from '@/src/db/schema';

export const CHANNELS: { type: KnowledgeItemType; label: string }[] = [
  { type: 'note', label: '메모' },
  { type: 'link', label: '링크' },
  { type: 'highlight', label: '하이라이트' },
  { type: 'screenshot', label: '스크린샷' },
  { type: 'share', label: '공유' },
];

type ChannelSegmentProps = {
  value: KnowledgeItemType;
  onChange: (type: KnowledgeItemType) => void;
};

export function ChannelSegment({ value, onChange }: ChannelSegmentProps) {
  return (
    <View className="px-6 pb-6">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row gap-2"
      >
        {CHANNELS.map((channel) => {
          const isActive = value === channel.type;
          return (
            <Pressable
              key={channel.type}
              onPress={() => onChange(channel.type)}
              className={`rounded-md px-3 py-1.5 ${
                isActive ? 'bg-app-text' : 'bg-app-border/40'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase tracking-tight ${
                  isActive ? 'text-white' : 'text-app-muted'
                }`}
              >
                {channel.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
