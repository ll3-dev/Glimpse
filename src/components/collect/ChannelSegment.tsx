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
    <View className="border-b border-border">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4"
        contentContainerClassName="flex-row gap-1 py-2"
      >
        {CHANNELS.map((channel) => {
          const isActive = value === channel.type;
          return (
            <Pressable
              key={channel.type}
              onPress={() => onChange(channel.type)}
              className={`rounded-full px-4 py-2 ${
                isActive ? 'bg-foreground' : 'bg-muted'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isActive ? 'text-background' : 'text-muted-foreground'
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
