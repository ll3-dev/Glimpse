import { Check, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { GraphEdge, Recommendation } from '@glimpse/shared';
import { useSemanticColor } from '@glimpse/ui';

type GraphEdgeInspectorProps = {
  edge: GraphEdge;
  recommendation?: Recommendation;
  isResponding: boolean;
  onOpenNode: (itemId: string) => void;
  onAccept: () => void;
  onIgnore: () => void;
  onDismiss: () => void;
  onClose: () => void;
};

export function GraphEdgeInspector({
  edge,
  recommendation,
  isResponding,
  onOpenNode,
  onAccept,
  onIgnore,
  onDismiss,
  onClose,
}: GraphEdgeInspectorProps) {
  const appMuted = useSemanticColor('appMuted');
  const appBg = useSemanticColor('appBg');
  const pending = recommendation?.status === 'pending';

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

      {pending ? (
        <View className="mt-2.5 flex-row gap-2">
          <Pressable
            onPress={onAccept}
            disabled={isResponding}
            className="h-9 flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-app-text active:opacity-80 disabled:opacity-40"
            accessibilityRole="button"
            accessibilityLabel="선택한 연결 수락"
          >
            <Check size={13} color={appBg} />
            <Text className="text-[11px] font-semibold text-app-bg">수락</Text>
          </Pressable>
          <Pressable
            onPress={onIgnore}
            disabled={isResponding}
            className="h-9 flex-1 items-center justify-center rounded-lg border border-app-border active:bg-app-bg disabled:opacity-40"
            accessibilityRole="button"
            accessibilityLabel="선택한 연결 무시"
          >
            <Text className="text-[11px] font-semibold text-app-muted">무시</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            disabled={isResponding}
            className="h-9 flex-1 items-center justify-center rounded-lg border border-app-border active:bg-app-bg disabled:opacity-40"
            accessibilityRole="button"
            accessibilityLabel="선택한 연결 나중에 보기"
          >
            <Text className="text-[11px] font-semibold text-app-muted">나중에</Text>
          </Pressable>
        </View>
      ) : (
        <Text className="mt-2.5 text-[11px] font-medium text-tag-mint-text">수락한 연결</Text>
      )}
    </View>
  );
}
