import { G, Circle, Line, Svg, Text } from 'react-native-svg';
import type { GraphEdge, GraphNode } from '@glimpse/shared';
import { computeGraphSelection } from './graph-selection';

type GraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  /** 노드 인덱스 → 점 색상 (화면에서 팔레트 토큰 해석해 주입) */
  palette: string[];
  onPressNode: (id: string) => void;
  onPressEdge: (id: string) => void;
  /** 시맨틱 해석된 기본 색상 (선·원 스트로크·라벨) */
  lineColor: string;
  strokeColor: string;
  labelColor: string;
  selectedStrokeColor: string;
};

const DIMMED_OPACITY = 0.35;

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

/**
 * 지식 그래프 캔버스. 데스크톱 KnowledgeGraph와 동일한 viewBox(0 0 1000 640)·
 * 노드 반경·라벨 규칙을 쓰며, 색상은 문자열 prop으로 주입받아 stateless를 유지한다.
 */
export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  palette,
  onPressNode,
  onPressEdge,
  lineColor,
  strokeColor,
  labelColor,
  selectedStrokeColor,
}: GraphCanvasProps) {
  const selection = computeGraphSelection(selectedNodeId, edges);
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source.id);
    connectedNodeIds.add(edge.target.id);
  }
  const selectedEdge = selectedEdgeId ? edges.find(({ id }) => id === selectedEdgeId) : null;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet">
      {edges.map((edge) => {
        const isSelected = edge.id === selectedEdgeId;
        const isActive = isSelected || (selection?.activeEdgeIds.has(edge.id) ?? false);
        const dimmed = selectedEdgeId != null ? !isSelected : selection != null && !isActive;
        return (
          <G key={edge.id}>
            <Line
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke={isActive ? selectedStrokeColor : lineColor}
              strokeWidth={isSelected ? 3 : isActive ? 2.5 : 1.5}
              opacity={dimmed ? DIMMED_OPACITY : 0.7}
            />
            <Line
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke="transparent"
              strokeWidth={20}
              onPress={() => onPressEdge(edge.id)}
              accessible
              accessibilityLabel={`${edge.source.label}와 ${edge.target.label} 연결 보기`}
            />
          </G>
        );
      })}
      {nodes.map((node, index) => {
        const isSelected = node.id === selection?.selectedId;
        const isNeighbor = selection?.connectedIds.has(node.id) ?? false;
        const belongsToSelectedEdge =
          selectedEdge?.source.id === node.id || selectedEdge?.target.id === node.id;
        const dimmed = selectedEdge
          ? !belongsToSelectedEdge
          : selection != null && !isNeighbor;
        return (
          <G key={node.id} onPress={() => onPressNode(node.id)} opacity={dimmed ? DIMMED_OPACITY : 1}>
            <Circle
              cx={node.x}
              cy={node.y}
              r={connectedNodeIds.has(node.id) ? 24 : 18}
              fill="none"
              stroke={isSelected ? selectedStrokeColor : strokeColor}
              strokeWidth={isSelected ? 2 : 1.5}
            />
            <Circle cx={node.x} cy={node.y} r={6} fill={palette[index % palette.length]} />
            <Text
              x={node.x}
              y={node.y + 36}
              textAnchor="middle"
              fontSize={12}
              fontWeight="500"
              fill={labelColor}
            >
              {truncate(node.label, 16)}
            </Text>
          </G>
        );
      })}
    </Svg>
  );
}
