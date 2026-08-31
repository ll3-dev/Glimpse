/**
 * Graph Screen
 *
 * 지식 연결 그래프 — 노드 탭 선택 → 선택 바에서 상세 이동.
 * 데스크톱 KnowledgeGraph와 shared 레이아웃(layoutGraph)을 공유한다.
 */

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Network } from 'lucide-react-native';
import { useKnowledgeItemsQuery, useAllRecommendationsQuery } from '@/src/hooks';
import { GraphCanvas, GraphSelectionBar, computeGraphSelection } from '@/src/components/graph';
import { layoutGraph } from '@glimpse/shared';
import { EmptyState, ScreenHeader, useSemanticColor } from '@glimpse/ui';

export default function GraphScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: items = [] } = useKnowledgeItemsQuery();
  const { data: recommendations = [] } = useAllRecommendationsQuery();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const appBorder = useSemanticColor('appBorder');
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const palette = [
    useSemanticColor('chart1'),
    useSemanticColor('chart2'),
    useSemanticColor('chart3'),
    useSemanticColor('chart4'),
    useSemanticColor('chart5'),
  ];

  const { nodes, edges } = useMemo(
    () => layoutGraph(items, recommendations),
    [items, recommendations],
  );
  const selection = useMemo(
    () => computeGraphSelection(selectedNodeId, edges),
    [selectedNodeId, edges],
  );
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
        <ScreenHeader title="연결" subtitle="지식 연결 그래프" />
        <EmptyState
          icon={Network}
          title="연결할 지식이 아직 없습니다"
          description={'자료를 저장하면\n지식 그래프가 자동으로 생성됩니다'}
        />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-app-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <ScreenHeader title="연결" subtitle={`${nodes.length}개 지식 · ${edges.length}개 연결`} />
      <View className="flex-1" style={{ borderTopWidth: 1, borderTopColor: appBorder }}>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          palette={palette}
          onPressNode={(id) => setSelectedNodeId((cur) => (cur === id ? null : id))}
          lineColor={appBorder}
          strokeColor={appMuted}
          labelColor={appText}
          selectedStrokeColor={appText}
        />
      </View>
      {selection && selectedNode && (
        <GraphSelectionBar
          selection={selection}
          nodeLabel={selectedNode.label}
          onOpenDetail={() => router.push(`/library/${selectedNode.id}`)}
          onClear={() => setSelectedNodeId(null)}
        />
      )}
    </View>
  );
}
