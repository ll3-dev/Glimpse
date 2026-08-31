/**
 * Graph Screen
 *
 * 지식 연결 그래프 — 노드 탭 선택 → 선택 바에서 상세 이동.
 * 데스크톱 KnowledgeGraph와 shared 레이아웃(layoutGraph)을 공유한다.
 */

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Network } from 'lucide-react-native';
import {
  useAllRecommendationsQuery,
  useKnowledgeItemsQuery,
  useRecommendationActionsMutation,
} from '@/src/hooks';
import {
  GraphCanvas,
  GraphDiscoveryCard,
  GraphEdgeInspector,
  GraphSelectionBar,
  computeGraphSelection,
} from '@/src/components/graph';
import { selectTodayDiscoveries } from '@glimpse/features';
import { layoutFocusedGraph, layoutGraph } from '@glimpse/shared';
import { EmptyState, ScreenHeader, useSemanticColor } from '@glimpse/ui';
import { recordMobileGraphDiscoveryOpen } from '@/src/features/graph/graph-metrics.store';

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function GraphScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focusId?: string | string[] }>();
  const focusedNodeId = readParam(params.focusId) || null;
  const insets = useSafeAreaInsets();
  const { data: items = [] } = useKnowledgeItemsQuery();
  const { data: recommendations = [] } = useAllRecommendationsQuery();
  const { respond, isPending: isResponding } = useRecommendationActionsMutation();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const appBorder = useSemanticColor('appBorder');
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const chart1 = useSemanticColor('chart1');
  const chart2 = useSemanticColor('chart2');
  const chart3 = useSemanticColor('chart3');
  const chart4 = useSemanticColor('chart4');
  const chart5 = useSemanticColor('chart5');
  const palette = useMemo(
    () => [chart1, chart2, chart3, chart4, chart5],
    [chart1, chart2, chart3, chart4, chart5],
  );

  const { nodes, edges } = useMemo(
    () => focusedNodeId
      ? layoutFocusedGraph(items, recommendations, focusedNodeId)
      : layoutGraph(items, recommendations),
    [focusedNodeId, items, recommendations],
  );
  const selection = useMemo(
    () => computeGraphSelection(focusedNodeId, edges),
    [focusedNodeId, edges],
  );
  const selectedNode = focusedNodeId ? nodes.find((node) => node.id === focusedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) : null;
  const activeEdgeId = selectedEdge?.id ?? null;
  const discovery = useMemo(
    () => selectTodayDiscoveries(items, recommendations, 1)[0],
    [items, recommendations],
  );

  const openItem = (itemId: string) => router.push(`/library/${itemId}`);
  const onOpenDiscoveryItem = (itemId: string) => {
    recordMobileGraphDiscoveryOpen();
    openItem(itemId);
  };
  const setFocusedNodeId = (itemId: string | null) => {
    router.setParams({ focusId: itemId ?? '' });
  };
  const hideRecommendation = (recommendationId: string) => {
    respond({ recommendationId, action: 'ignore' });
  };

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
      {discovery ? (
        <GraphDiscoveryCard
          discovery={discovery}
          onOpenItem={onOpenDiscoveryItem}
          onFocus={(itemId) => {
            setFocusedNodeId(itemId);
            setSelectedEdgeId(null);
          }}
        />
      ) : null}
      <View className="flex-1" style={{ borderTopWidth: 1, borderTopColor: appBorder }}>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={focusedNodeId}
          selectedEdgeId={activeEdgeId}
          palette={palette}
          onPressNode={(id) => {
            setFocusedNodeId(focusedNodeId === id ? null : id);
            setSelectedEdgeId(null);
          }}
          onPressEdge={(id) => setSelectedEdgeId((current) => (current === id ? null : id))}
          lineColor={appBorder}
          strokeColor={appMuted}
          labelColor={appText}
          selectedStrokeColor={appText}
        />
      </View>
      {selectedEdge ? (
        <GraphEdgeInspector
          edge={selectedEdge}
          isResponding={isResponding}
          onOpenNode={openItem}
          onHide={() => hideRecommendation(selectedEdge.id)}
          onClose={() => setSelectedEdgeId(null)}
        />
      ) : selection && selectedNode ? (
        <GraphSelectionBar
          selection={selection}
          nodeLabel={selectedNode.label}
          onOpenDetail={() => openItem(selectedNode.id)}
          onClear={() => setFocusedNodeId(null)}
        />
      ) : null}
    </View>
  );
}
