import { View, Pressable, Text } from 'react-native';
import type { KnowledgeItemType } from '@glimpse/shared';

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
    <View className="px-6 pb-4">
      <View className="bg-app-border/20 p-1 rounded-lg flex-row">
        {CHANNELS.map((channel) => {
          const isActive = value === channel.type;
          return (
            <Pressable
              key={channel.type}
              onPress={() => onChange(channel.type)}
              className={`flex-1 rounded-md py-1.5 items-center justify-center ${
                isActive ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  isActive ? 'text-app-text' : 'text-app-muted'
                }`}
              >
                {channel.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
