import { Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';
import type { GraphSelection } from './graph-selection';

type GraphSelectionBarProps = {
  selection: GraphSelection;
  nodeLabel: string;
  onOpenDetail: () => void;
  onClear: () => void;
};

const MAX_REASONS = 2;

/**
 * 노드 선택 바 — 데스크톱의 엣지 hover tooltip을 대체하는 자리.
 * 선택 노드 라벨·연결 수·근거 요약과 "상세 보기" CTA를 노출한다.
 */
export function GraphSelectionBar({ selection, nodeLabel, onOpenDetail, onClear }: GraphSelectionBarProps) {
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const appBorder = useSemanticColor('appBorder');
  const appSurface = useSemanticColor('appSurface');
  const appBg = useSemanticColor('appBg');

  const reasons = selection.incidentReasons;
  const shown = reasons.slice(0, MAX_REASONS);
  const rest = reasons.length - shown.length;

  return (
    <View
      className="mx-4 mb-2 rounded-2xl border px-4 py-3"
      style={{ backgroundColor: appSurface, borderColor: appBorder }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 min-w-0 mr-2">
          <Text className="text-sm font-semibold" style={{ color: appText }} numberOfLines={1}>
            {nodeLabel}
          </Text>
          <Text className="text-xs font-medium mt-0.5" style={{ color: appMuted }}>
            연결 {selection.connectedIds.size - 1}개
          </Text>
          {shown.map((reason, i) => (
            <Text key={i} className="text-xs mt-0.5" style={{ color: appMuted }} numberOfLines={1}>
              {reason}
            </Text>
          ))}
          {rest > 0 && (
            <Text className="text-xs mt-0.5" style={{ color: appMuted }}>
              +{rest}개 근거 더보기
            </Text>
          )}
        </View>
        <Pressable hitSlop={8} onPress={onClear} accessibilityRole="button" accessibilityLabel="선택 해제">
          <X size={16} color={appMuted} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        className="mt-2 self-start rounded-full px-4 py-2 active:opacity-90"
        style={{ backgroundColor: appText }}
        onPress={onOpenDetail}
      >
        <Text className="text-xs font-semibold" style={{ color: appBg }}>
          상세 보기
        </Text>
      </Pressable>
    </View>
  );
}
