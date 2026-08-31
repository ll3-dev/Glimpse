import { EyeOff, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { GraphEdge } from '@glimpse/shared';
import { useSemanticColor } from '@glimpse/ui';

type GraphEdgeInspectorProps = {
  edge: GraphEdge;
  isResponding: boolean;
  onOpenNode: (itemId: string) => void;
  onHide: () => void;
  onClose: () => void;
};

export function GraphEdgeInspector({
  edge,
  isResponding,
  onOpenNode,
  onHide,
  onClose,
}: GraphEdgeInspectorProps) {
  const appMuted = useSemanticColor('appMuted');

  return (
    <View className="mx-4 mb-2 rounded-xl border border-app-border bg-app-surface px-4 py-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
            연결 근거
          </Text>
          <Text className="mt-1 text-xs leading-relaxed text-app-text" numberOfLines={3}>
            {edge.reason?.trim() || '저장된 연결 근거가 없습니다.'}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          className="h-8 w-8 items-center justify-center rounded-lg active:bg-app-bg"
          accessibilityRole="button"
          accessibilityLabel="연결 정보 닫기"
        >
          <X size={15} color={appMuted} />
        </Pressable>
      </View>

      <View className="mt-2.5 flex-row gap-2">
        {[edge.source, edge.target].map((node) => (
          <Pressable
            key={node.id}
            onPress={() => onOpenNode(node.id)}
            className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel={`${node.label} 상세 보기`}
          >
            <Text className="text-xs font-semibold text-app-text" numberOfLines={1}>
              {node.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onHide}
        disabled={isResponding}
        className="mt-2.5 h-9 flex-row items-center justify-center gap-1.5 rounded-lg active:bg-app-bg disabled:opacity-40"
        accessibilityRole="button"
        accessibilityLabel="이 연결 숨기기"
      >
        <EyeOff size={13} color={appMuted} />
        <Text className="text-[11px] font-semibold text-app-muted">이 연결 숨기기</Text>
      </Pressable>
    </View>
  );
}
