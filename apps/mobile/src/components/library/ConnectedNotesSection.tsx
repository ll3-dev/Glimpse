import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Network } from 'lucide-react-native';
import type { KnowledgeItem } from '@glimpse/shared';
import { useSemanticColor } from '@glimpse/ui';
import {
  connectedNotesForItem,
  type ConnectedNote,
} from '@/src/features/recommendation';

interface ConnectedNotesSectionProps {
  itemId: string;
  edges: Parameters<typeof connectedNotesForItem>[1];
  items: KnowledgeItem[];
}

/**
 * 보관함 상세 하단 "연결된 노트" 섹션 — 데스크톱 그래프 엣지의 모바일
 * 읽기 전용 뷰. 엣지 생성은 데스크톱 전담(설계: 2026-08-30), 노드 탭 시
 * 해당 아이템 상세로 이동.
 */
export function ConnectedNotesSection({ itemId, edges, items }: ConnectedNotesSectionProps) {
  const router = useRouter();
  const appMuted = useSemanticColor('appMuted');
  const notes: ConnectedNote[] = connectedNotesForItem(itemId, edges, items);

  if (notes.length === 0) return null;

  return (
    <View className="mt-1 mb-5">
      <View className="flex-row items-center gap-1.5 mb-2">
        <Network size={14} color={appMuted} />
        <Text className="text-sm font-semibold text-app-text">
          연결된 노트 {notes.length}
        </Text>
      </View>
      {notes.map((note) => (
        <Pressable
          key={note.item.id}
          onPress={() => router.push(`/library/${note.item.id}`)}
          className="bg-app-surface border border-app-border rounded-xl p-3.5 mb-2 active:opacity-80 shadow-xs"
          accessibilityRole="button"
          accessibilityLabel={`${note.item.title ?? '노트'}으로 이동`}
        >
          <Text className="text-sm font-medium text-app-text" numberOfLines={1}>
            {note.item.title ?? '제목 없는 노트'}
          </Text>
          {note.reason ? (
            <Text className="text-xs text-app-muted mt-1" numberOfLines={2}>
              {note.reason}
            </Text>
          ) : null}
          {note.sharedTags.length > 0 && (
            <View className="flex-row flex-wrap gap-1 mt-2">
              {note.sharedTags.slice(0, 3).map((tag) => (
                <View
                  key={tag}
                  className="bg-app-bg border border-app-border rounded-md px-1.5 py-0.5"
                >
                  <Text className="text-[11px] text-app-muted">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
