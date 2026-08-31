# Phase 2 — 모바일 그래프 뷰 구현 플랜

> **상태: 완료 (2026-08-31)**
>
> - 구현 커밋: `0b8d938`, `3bca5ab`, `1cac6bf`, `93e47bc`, `e05c288`
> - 시뮬레이터: iPhone 17에서 `ll3.kr://graph` 직접 딥링크로 연결 탭 빈 상태 렌더 확인
> - 자동 검증: 모바일 전체 테스트 652 pass/0 fail, lint, 모바일·데스크톱 typecheck 통과
> - 계획 변경: 임시 `index` redirect는 hidden route + `lazy: false`에서 본문이 비는
>   테스트 하네스 문제를 유발해 폐기했다. 원래 `./library` redirect를 복원하고 실제
>   공개 딥링크로 화면을 검증했다.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 데스크톱의 지식 그래프를 모바일 "연결" 탭으로 제공하고, 레이아웃 로직을 `packages/shared`로 승격해 쌍둥이 드리프트를 차단한다.

**Architecture:** `apps/desktop/src/features/graph/layout.ts`(순수 함수)를 `packages/shared/src/graph-layout.ts`로 이동하고 데스크톱 소비자를 shared 직접 임포트로 전환. 모바일은 `app/(tabs)/graph.tsx` 신설 + composed UI를 `src/components/graph/`에 배치, `react-native-svg`로 렌더, 차트 팔레트는 `packages/ui` 시맨틱 토큰 신설(light/dark 쌍).

**Tech Stack:** expo-router Tabs, react-native-svg(기존 의존성 15.15.4), uniwind `@variant` 테마, bun:test.

**선행 컨텍스트 (조사 완료):**

- 데스크톱 `layout.test.ts`는 **존재하지 않음** → 마스터 설계의 "테스트 이동"은 신규 작성으로 조정.
- 데스크톱 `layoutGraph` 소비자는 `KnowledgeGraph.tsx` 단 1곳 → shim 없이 삭제·전환 가능.
- 모바일 데이터 소스: `useKnowledgeItemsQuery` + **`useAllRecommendationsQuery`**(`@/src/hooks`).
  `useAllRecommendationsQuery`는 전체 상태를 반환하고 `layoutGraph`가 내부에서
  pending/accepted만 필터링하므로 정합 (pending 전용 훅을 쓰면 accepted 엣지가 누락됨).
- 모바일 그래프 데이터소스 참고: `apps/mobile/app/(tabs)/digest.tsx` (ScreenHeader·QueryStateScrollView·insets 패턴).
- 차트 색상 원본: `apps/desktop/src/styles/globals.css:125-129`(light)·`:184-188`(dark).
- 테스트 패턴: `packages/ui/src/primitives/empty-state.test.tsx` — react-native는 setup.ts 목,
  `useSemanticColor`는 모듈 목, `react-dom/server`로 정적 마크업 검증.
- 라우트: `app/library/[id].tsx` 존재 → `router.push(\`/library/${id}\`)`.
- 시뮬레이터 스크린샷 한계: `kr.ll3.glimpse://` 딥링크는 expo-dev-client에 가로채짐(Phase 1 확인).
  그래프 탭 진입 자동화는 `(tabs)/index.tsx`의 Redirect를 임시 변경하는 방식 사용(Task 6).

---

### Task 1: 차트 팔레트 시맨틱 토큰 신설 (packages/ui)

**Files:**
- Modify: `packages/ui/styles/globals.css`
- Modify: `packages/ui/src/theme/semantic-colors.ts`
- Create: `packages/ui/src/theme/semantic-colors.test.ts`

**Step 1: 실패하는 테스트 작성**

`packages/ui/src/theme/semantic-colors.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CSS_VARIABLES } from './semantic-colors';

// 차트 팔레트 토큰이 시맨틱 훅과 CSS 양쪽에 light/dark 쌍으로 존재해야 한다.
// (모바일 그래프 노드 점 색상 — 데스크톱 --chart-*와 동일 팔레트)

describe('차트 팔레트 시맨틱 토큰', () => {
  test('chart1~5가 CSS 변수에 매핑된다', () => {
    expect(CSS_VARIABLES.chart1).toBe('--color-chart-1');
    expect(CSS_VARIABLES.chart2).toBe('--color-chart-2');
    expect(CSS_VARIABLES.chart3).toBe('--color-chart-3');
    expect(CSS_VARIABLES.chart4).toBe('--color-chart-4');
    expect(CSS_VARIABLES.chart5).toBe('--color-chart-5');
  });

  test('globals.css @theme에 5색이 선언된다', () => {
    const css = readFileSync(join(import.meta.dir, '../../styles/globals.css'), 'utf8');
    for (const n of [1, 2, 3, 4, 5]) {
      expect(css).toContain(`--color-chart-${n}:`);
    }
  });

  test('dark @variant 블록에도 5색 오버라이드가 선언된다', () => {
    const css = readFileSync(join(import.meta.dir, '../../styles/globals.css'), 'utf8');
    const darkBlock = css.slice(css.indexOf('@variant dark'), css.indexOf('@variant light'));
    for (const n of [1, 2, 3, 4, 5]) {
      expect(darkBlock).toContain(`--color-chart-${n}:`);
    }
  });
});
```

주의: `CSS_VARIABLES`는 현재 export되지 않으므로 `export const CSS_VARIABLES`로 변경이
테스트 실행 전 필요하다(1차 실행 전 내보내기만 추가하고 토큰 값은 아직 추가하지 않는다 —
이 순간 테스트는 chart1 매핑에서 실패해야 정상).

**Step 2: 테스트 실패 확인**

Run: `cd /Users/loopy/dev/ll3/Glimpse && bun test packages/ui/src/theme/semantic-colors.test.ts`
Expected: FAIL (chart1 매핑 없음)

**Step 3: 구현**

`packages/ui/styles/globals.css`:

- `@theme` 블록(`--color-tag-neutral-text` 뒤)에 추가:

```css
  --color-chart-1: #2383e2;
  --color-chart-2: #1a7f37;
  --color-chart-3: #a04100;
  --color-chart-4: #6e3ab7;
  --color-chart-5: #eb5757;
```

- `@variant dark` 블록(`--color-app-accent` 뒤)에 추가:

```css
      --color-chart-1: #529cca;
      --color-chart-2: #7ee787;
      --color-chart-3: #ffa657;
      --color-chart-4: #d2a8ff;
      --color-chart-5: #ff7b72;
```

- `@variant light` 블록(`--color-app-accent` 뒤)에 추가(@theme과 동일 값 재진술 —
  uniwind는 두 테마가 같은 변수 집합을 선언해야 함):

```css
      --color-chart-1: #2383e2;
      --color-chart-2: #1a7f37;
      --color-chart-3: #a04100;
      --color-chart-4: #6e3ab7;
      --color-chart-5: #eb5757;
```

`packages/ui/src/theme/semantic-colors.ts`:

- `SemanticColorName` 유니언에 `'chart1' | 'chart2' | 'chart3' | 'chart4' | 'chart5'` 추가.
- `CSS_VARIABLES`에 `chart1: '--color-chart-1'` … `chart5: '--color-chart-5'` 추가
  및 `export const`로 변경.
- `FALLBACKS`에 light 값 추가: `chart1: '#2383e2'`, `chart2: '#1a7f37'`,
  `chart3: '#a04100'`, `chart4: '#6e3ab7'`, `chart5: '#eb5757'`.

**Step 4: 테스트 통과 확인**

Run: `bun test packages/ui/src/theme/semantic-colors.test.ts`
Expected: PASS (3 tests)

**Step 5: 커밋**

```bash
git add packages/ui/styles/globals.css packages/ui/src/theme/semantic-colors.ts packages/ui/src/theme/semantic-colors.test.ts
git commit -m "feat(ui): 차트 팔레트 시맨틱 토큰 신설 — chart1~5 light/dark 쌍"
```

---

### Task 2: 그래프 레이아웃 shared 승격 + 데스크톱 전환

**Files:**
- Create: `packages/shared/src/graph-layout.ts` (desktop `layout.ts` 내용 이동)
- Create: `packages/shared/src/graph-layout.test.ts` (신규 — 기존 테스트 없음 확인됨)
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/desktop/src/components/graph/KnowledgeGraph.tsx:4`
- Delete: `apps/desktop/src/features/graph/layout.ts`

**Step 1: 실패하는 테스트 작성**

`packages/shared/src/graph-layout.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem, Recommendation } from './index';
import { layoutGraph } from './graph-layout';

function item(partial: Partial<KnowledgeItem> & { id: string }): KnowledgeItem {
  return {
    type: 'note', title: null, body: null, url: null, summary: null, tags: null,
    createdAt: 0, updatedAt: 0, stability: null, difficulty: null, lastReviewedAt: null,
    nextReviewAt: null, ...partial,
  };
}

function edge(partial: Partial<Recommendation> & { id: string; itemA_id: string; itemB_id: string }): Recommendation {
  return {
    reason: null, status: 'pending', createdAt: 0, respondedAt: null, ...partial,
  };
}

describe('layoutGraph', () => {
  test('연결된 항목을 우선하고 최대 36개로 제한한다', () => {
    const items = [
      item({ id: 'lonely', updatedAt: 999 }), // 최신이지만 연결 없음
      ...Array.from({ length: 40 }, (_, i) => item({ id: `c${i}`, updatedAt: i })),
    ];
    const recommendations = [edge({ id: 'e0', itemA_id: 'c0', itemB_id: 'c1' })];
    const { nodes } = layoutGraph(items, recommendations);
    expect(nodes.length).toBe(36);
    expect(nodes.some((n) => n.id === 'lonely')).toBe(false);
    expect(nodes.some((n) => n.id === 'c0')).toBe(true);
  });

  test('pending·accepted 외 상태의 엣지는 제외한다', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    const recommendations = [
      edge({ id: 'e1', itemA_id: 'a', itemB_id: 'b', status: 'ignored' }),
      edge({ id: 'e2', itemA_id: 'a', itemB_id: 'b', status: 'dismissed' }),
    ];
    const { edges } = layoutGraph(items, recommendations);
    expect(edges).toEqual([]);
  });

  test('엔드포인트가 보이는 노드가 아닌 엣지는 버린다', () => {
    const items = [item({ id: 'a' })];
    const recommendations = [edge({ id: 'e1', itemA_id: 'a', itemB_id: 'ghost' })];
    const { edges } = layoutGraph(items, recommendations);
    expect(edges).toEqual([]);
  });

  test('라벨은 title → summary → Untitled 순으로 폴백한다', () => {
    const { nodes } = layoutGraph(
      [item({ id: 't', title: '제목' }), item({ id: 's', summary: '요약' }), item({ id: 'u' })],
      [],
    );
    const labels = Object.fromEntries(nodes.map((n) => [n.id, n.label]));
    expect(labels.t).toBe('제목');
    expect(labels.s).toBe('요약');
    expect(labels.u).toBe('Untitled');
  });

  test('노드는 타원 궤도에 배치되고 엣지는 노드 좌표를 공유한다', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    const recommendations = [edge({ id: 'e1', itemA_id: 'a', itemB_id: 'b', reason: '근거' })];
    const { nodes, edges } = layoutGraph(items, recommendations);
    expect(nodes).toHaveLength(2);
    expect(edges[0].source.id).toBe('a');
    expect(edges[0].target.id).toBe('b');
    expect(edges[0].reason).toBe('근거');
    for (const node of nodes) {
      expect(Math.hypot(node.x - 500, node.y - 330)).toBeGreaterThan(0);
    }
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `bun test packages/shared/src/graph-layout.test.ts`
Expected: FAIL (graph-layout 모듈 없음)

**Step 3: 구현 — 파일 이동**

`apps/desktop/src/features/graph/layout.ts`의 전체 내용(52줄)을
`packages/shared/src/graph-layout.ts`로 그대로 복사한다. 임포트 경로만 변경:

```ts
import type { KnowledgeItem, Recommendation } from './index';
```

`packages/shared/src/index.ts` 마지막 export 목록에 추가:

```ts
export * from './graph-layout';
```

`apps/desktop/src/features/graph/layout.ts` 삭제.

`apps/desktop/src/components/graph/KnowledgeGraph.tsx:4`:

```ts
// 변경 전
import { layoutGraph } from '@/features/graph/layout';
// 변경 후
import { layoutGraph } from '@glimpse/shared';
```

**Step 4: 테스트 통과 + 데스크톱 회귀 확인**

Run: `bun test packages/shared && bun test apps/desktop && bun run desktop:typecheck && bun run desktop:lint`
Expected: 전부 PASS/exit 0

**Step 5: 커밋**

```bash
git add packages/shared/src/graph-layout.ts packages/shared/src/graph-layout.test.ts packages/shared/src/index.ts apps/desktop/src/components/graph/KnowledgeGraph.tsx
git rm apps/desktop/src/features/graph/layout.ts
git commit -m "refactor(shared): 그래프 레이아웃 shared 승격 — 데스크톱 소비자 전환·단위 테스트 신설"
```

---

### Task 3: 그래프 선택 순수 유틸 (모바일)

**Files:**
- Create: `apps/mobile/src/components/graph/graph-selection.ts`
- Create: `apps/mobile/src/components/graph/graph-selection.test.ts`

**Step 1: 실패하는 테스트 작성**

`apps/mobile/src/components/graph/graph-selection.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import type { GraphEdge } from '@glimpse/shared';
import { computeGraphSelection } from './graph-selection';

function node(id: string) {
  return { id, label: id, x: 0, y: 0 };
}

function edge(id: string, a: string, b: string, reason: string | null = null): GraphEdge {
  return { id, source: node(a), target: node(b), reason };
}

describe('computeGraphSelection', () => {
  test('선택 노드와 인접 노드, 활성 엣지를 계산한다', () => {
    const edges = [edge('e1', 'a', 'b', '근거1'), edge('e2', 'b', 'c'), edge('e3', 'c', 'd')];
    const selection = computeGraphSelection('a', edges);
    expect(selection.connectedIds).toEqual(new Set(['a', 'b']));
    expect(selection.activeEdgeIds).toEqual(new Set(['e1']));
  });

  test('인접 엣지의 reason을 엣지 순서대로 수집한다 (null 제외)', () => {
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'a', 'c', '근거2'), edge('e3', 'c', 'd', '무관')];
    const selection = computeGraphSelection('a', edges);
    expect(selection.incidentReasons).toEqual(['근거2']);
  });

  test('선택이 null이면 null을 반환한다', () => {
    expect(computeGraphSelection(null, [edge('e1', 'a', 'b')])).toBeNull();
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `bun test apps/mobile/src/components/graph/graph-selection.test.ts`
Expected: FAIL (모듈 없음)

**Step 3: 구현**

`apps/mobile/src/components/graph/graph-selection.ts`:

```ts
import type { GraphEdge } from '@glimpse/shared';

/**
 * 노드 선택 상태를 렌더 친화형 집합으로 변환하는 순수 유틸.
 * 데스크톱 KnowledgeGraph의 useMemo 선택 로직과 동일한 의미론을 유지한다.
 */
export interface GraphSelection {
  selectedId: string;
  /** 선택 노드 + 인접 노드 (하이라이트 유지 대상) */
  connectedIds: Set<string>;
  /** 선택 노드에 인접한 엣지 (진하게 렌더) */
  activeEdgeIds: Set<string>;
  /** 인접 엣지의 reason 목록 (엣지 순서, null 제외) — 선택 바 요약용 */
  incidentReasons: string[];
}

export function computeGraphSelection(
  selectedNodeId: string | null,
  edges: GraphEdge[],
): GraphSelection | null {
  if (!selectedNodeId) return null;
  const connectedIds = new Set<string>([selectedNodeId]);
  const activeEdgeIds = new Set<string>();
  const incidentReasons: string[] = [];
  for (const edge of edges) {
    const otherId =
      edge.source.id === selectedNodeId
        ? edge.target.id
        : edge.target.id === selectedNodeId
          ? edge.source.id
          : null;
    if (otherId) {
      connectedIds.add(otherId);
      activeEdgeIds.add(edge.id);
      if (edge.reason) incidentReasons.push(edge.reason);
    }
  }
  return { selectedId: selectedNodeId, connectedIds, activeEdgeIds, incidentReasons };
}
```

**Step 4: 테스트 통과 확인**

Run: `bun test apps/mobile/src/components/graph/graph-selection.test.ts`
Expected: PASS (3 tests)

**Step 5: 커밋**

```bash
git add apps/mobile/src/components/graph/graph-selection.ts apps/mobile/src/components/graph/graph-selection.test.ts
git commit -m "feat(mobile): 그래프 선택 상태 순수 유틸 — 인접 하이라이트·근거 수집"
```

---

### Task 4: GraphCanvas·GraphSelectionBar composed 컴포넌트

**Files:**
- Create: `apps/mobile/src/components/graph/GraphCanvas.tsx`
- Create: `apps/mobile/src/components/graph/GraphSelectionBar.tsx`
- Create: `apps/mobile/src/components/graph/index.ts`
- Create: `apps/mobile/src/components/graph/GraphCanvas.test.tsx`

**핵심 설계:**

- `GraphCanvas`: `react-native-svg`의 `Svg`·`G`·`Line`·`Circle`·`Text`로
  viewBox `0 0 1000 640` 렌더 (데스크톱과 동일 좌표계). 색상은 문자열 prop으로
  주입받는다(시맨틱 해석은 화면에서 `useSemanticColor`로 수행 — 컴포넌트는 stateless 유지).
- 노드: 바깥 원 r=24(연결 있음)/18(고립), 안 점 r=6 팔레트 색, 라벨 y=36 `truncate 16`.
- 선택 상태: 인접 엣지 `activeColor`·두께 2.5, 비인접 노드·엣지는 `dimmedOpacity`(0.35).
- `GraphSelectionBar`: 선택 노드 라벨·연결 수·근거 요약(첫 2개 + `+N`)+
  "상세 보기" 버튼과 닫기 버튼. 데스크톱 hover tooltip을 대체하는 자리.
- 엣지 reason tooltip은 모바일에 없음 → 선택 바가 대체(마스터 설계 확정).

**Step 1: 실패하는 테스트 작성**

`apps/mobile/src/components/graph/GraphCanvas.test.tsx`:

```tsx
import { describe, expect, mock, test } from 'bun:test';

// react-native-svg를 호스트 문자열 더미로 목킹 (setup.ts의 react-native 목과 동일 방식).
// useSemanticColor는 uniwind JSI 의존이므로 모듈 자체를 고정 스텁으로 대체한다.
const svgHosts: Record<string, string> = {
  Svg: 'svg', G: 'g', Line: 'line', Circle: 'circle', Text: 'text',
};
mock.module('react-native-svg', () => svgHosts);
mock.module('@glimpse/ui', () => ({
  useSemanticColor: (_name: string) => '#787774',
}));

const { renderToStaticMarkup } = await import('react-dom/server');
const { GraphCanvas } = await import('./GraphCanvas');
import type { GraphEdge, GraphNode } from '@glimpse/shared';

function node(id: string, x: number, y: number): GraphNode {
  return { id, label: `라벨-${id}`, x, y };
}

describe('GraphCanvas', () => {
  const nodes = [node('a', 100, 100), node('b', 300, 100), node('c', 500, 100)];
  const edges: GraphEdge[] = [
    { id: 'e1', source: nodes[0], target: nodes[1], reason: '근거' },
  ];

  test('노드 원 3개와 엣지 라인 1개를 렌더한다', () => {
    const html = renderToStaticMarkup(
      <GraphCanvas nodes={nodes} edges={edges} selectedNodeId={null} onPressNode={() => {}} />,
    );
    expect(html.split('<circle').length - 1).toBe(3 * 2 + 1); // 바깥원+안점 × 3 + 중심점 없음 → 7? 아래 참고
  });
});
```

주의: 노드당 바깥원+안점 2개 = 6개 circle. 테스트 기대값은 `6`으로 확정한다
(중심 색점은 노드당 1개). 라벨 텍스트 검증 1건, dimmed 클래스 검증 1건 추가:

```tsx
  test('노드 라벨을 렌더한다', () => {
    const html = renderToStaticMarkup(
      <GraphCanvas nodes={nodes} edges={edges} selectedNodeId={null} onPressNode={() => {}} />,
    );
    expect(html).toContain('라벨-a');
  });

  test('선택 시 비인접 노드가 디밍된다', () => {
    const html = renderToStaticMarkup(
      <GraphCanvas nodes={nodes} edges={edges} selectedNodeId="a" onPressNode={() => {}} />,
    );
    // c는 a와 인접하지 않으므로 디밍 속성이 적용된다
    expect(html).toContain('0.35');
  });
```

(circle 개수 검증은 목킹된 호스트가 props를 그대로 출력한다는 전제에 의존하므로,
`html.match(/<circle/g)?.length` 기준 `6`을 기대값으로 고정.)

**Step 2: 테스트 실패 확인**

Run: `bun test apps/mobile/src/components/graph/GraphCanvas.test.tsx`
Expected: FAIL (GraphCanvas 없음)

**Step 3: GraphCanvas 구현**

```tsx
import { G, Circle, Line, Svg, Text } from 'react-native-svg';
import type { GraphEdge, GraphNode } from '@glimpse/shared';
import { computeGraphSelection } from './graph-selection';

type GraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  /** 노드 인덱스 → 점 색상 (화면에서 팔레트 토큰 해석해 주입) */
  palette: string[];
  onPressNode: (id: string) => void;
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

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  palette,
  onPressNode,
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

  return (
    <Svg width="100%" height="100%" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet">
      {edges.map((edge) => {
        const isActive = selection?.activeEdgeIds.has(edge.id) ?? false;
        const dimmed = selection != null && !isActive;
        return (
          <Line
            key={edge.id}
            x1={edge.source.x}
            y1={edge.source.y}
            x2={edge.target.x}
            y2={edge.target.y}
            stroke={isActive ? selectedStrokeColor : lineColor}
            strokeWidth={isActive ? 2.5 : 1.5}
            opacity={dimmed ? DIMMED_OPACITY : 0.7}
          />
        );
      })}
      {nodes.map((node, index) => {
        const isSelected = node.id === selection?.selectedId;
        const isNeighbor = selection?.connectedIds.has(node.id) ?? false;
        const dimmed = selection != null && !isNeighbor;
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
```

**Step 4: GraphSelectionBar 구현**

```tsx
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
            <Text className="text-xs font-medium" style={{ color: appMuted }}>
              {'  ·  연결 '}{selection.connectedIds.size - 1}개
            </Text>
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
        className="mt-2 self-start rounded-full px-4 py-2"
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
```

**Step 5: index.ts 작성 + 테스트 통과**

`apps/mobile/src/components/graph/index.ts`:

```ts
export { GraphCanvas } from './GraphCanvas';
export { GraphSelectionBar } from './GraphSelectionBar';
export { computeGraphSelection, type GraphSelection } from './graph-selection';
```

Run: `bun test apps/mobile/src/components/graph`
Expected: PASS (graph-selection 3 + GraphCanvas 3)

**Step 6: 커밋**

```bash
git add apps/mobile/src/components/graph
git commit -m "feat(mobile): 그래프 캔버스·선택 바 컴포넌트 — svg 렌더·근거 요약"
```

---

### Task 5: "연결" 탭 화면 + 탭 바 등록

**Files:**
- Create: `apps/mobile/app/(tabs)/graph.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Step 1: graph.tsx 작성**

digest.tsx 패턴 준수 (ScreenHeader·insets·`@/src/hooks`):

```tsx
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
import { GraphCanvas, GraphSelectionBar } from '@/src/components/graph';
import { layoutGraph } from '@glimpse/shared';
import { EmptyState, ScreenHeader, useSemanticColor } from '@glimpse/ui';

export default function GraphScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: items = [], isLoading } = useKnowledgeItemsQuery();
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
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
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
      {selectedNode && (
        <GraphSelectionBar
          selection={...}  // computeGraphSelection(selectedNodeId, edges)! — non-null 단언 대신 컴포넌트에서 재계산해 전달
          nodeLabel={selectedNode.label}
          onOpenDetail={() => router.push(`/library/${selectedNode.id}`)}
          onClear={() => setSelectedNodeId(null)}
        />
      )}
    </View>
  );
}
```

주의: 위 `{...}` 자리는 의사코드 표기다. 실제 구현은
`computeGraphSelection(selectedNodeId, edges)`를 호출해 null 가능성을 처리한다 —
`selectedNode`가 존재하는 시점엔 selection도 non-null이므로:

```tsx
const selection = useMemo(
  () => computeGraphSelection(selectedNodeId, edges),
  [selectedNodeId, edges],
);
// 바디에서: {selection && selectedNode && (<GraphSelectionBar selection={selection} ... />)}
```

`computeGraphSelection`은 index.ts에서 재수출됨. 로딩 중 렌더는 YAGNI —
React Query 캐시가 기본 로딩을 짧게 유지하고 빈 데이터는 EmptyState가 커버한다.

**Step 2: 탭 바 등록**

`apps/mobile/app/(tabs)/_layout.tsx`:

- 임포트에 `Network` 추가: `import { Library, Sparkles, RotateCcw, MessageCircle, Network } from "lucide-react-native";`
- `digest` Screen 뒤에 추가:

```tsx
        <Tabs.Screen
          name="graph"
          options={{
            title: "연결",
            tabBarIcon: ({ color }) => <Network color={color} size={18} />,
          }}
        />
```

**Step 3: 게이트 확인**

Run: `bun run lint && bun run typecheck && bun test apps/mobile/src/components/graph`
Expected: 전부 PASS

**Step 4: 커밋**

```bash
git add "apps/mobile/app/(tabs)/graph.tsx" "apps/mobile/app/(tabs)/_layout.tsx"
git commit -m "feat(mobile): 연결 탭 신설 — 지식 그래프 뷰·선택 바 상세 이동"
```

---

### Task 6: 시뮬레이터 스크린샷 검증 + 최종 게이트

**사전 조건:** iPhone 17 시뮬레이터 부팅, Metro(localhost:8081) 가동. Phase 1에서
빌드된 앱 재사용 — JS만 변경했으므로 네이티브 재빌드 불필요(react-native-svg는
이미 네이티브에 포함 — `apps/mobile/package.json:101` 기존 의존성).

**Step 1: 그래프 탭 진입 자동화 (딥링크 가로채기 우회)**

`app/(tabs)/index.tsx`의 `Redirect href="./library"`를 임시로 `"./graph"`로 변경 →
Metro 번들 재생성 후 dev client 리로드:

```bash
xcrun simctl openurl booted "kr.ll3.glimpse://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
sleep 12
xcrun simctl io booted screenshot /tmp/glimpse-03-graph.png
```

**Step 2: 스크린샷 판별**

- 그래프 탭(빈 상태 EmptyState 또는 노드 렌더)이 보이면 성공.
- 리로드 실패·흰 화면이면 재시도 1회 후 실패로 기록 — 상호작용 항목은 수동 문서로 이관
  (Phase 1 판정 원칙 준수. 무리한 우회 시도 금지).

**Step 3: 임시 변경 되돌리기**

`index.tsx`의 Redirect를 `"./library"`로 복원 (커밋에 포함되지 않도록 확인).

**Step 4: 최종 게이트**

```bash
bun run lint && bun run typecheck && bun run desktop:lint && bun run desktop:typecheck
bun run test:coverage
```

Expected: 전부 그린.

**Step 5: 마스터 설계 완료 표기 + 커밋**

`docs/plans/2026-08-31-roadmap-gates-graph-capture-design.md` Phase 2 섹션 상단에
완료 인용 블록 추가(검증 결과·스크린샷 판정·shared 승격 커밋 해시) 후:

```bash
git add docs/plans/2026-08-31-roadmap-gates-graph-capture-design.md
git commit -m "docs(plans): Phase 2 모바일 그래프 뷰 완료 표기"
```

---

## 리스크·비고

1. **react-native-svg 목킹 테스트**: `G`의 `onPress` 등 props는 정적 마크업에
   출력되지 않을 수 있음 — 테스트는 circle 개수·라벨·opacity 값만 검증.
2. **중첩 Text (선택 바)**: RN 중첩 Text는 인라인 렌더된다. static markup 검증에서
   텍스트가 분리되어 나오면 개별 Text로 평탄화한다.
3. **`useAllRecommendationsQuery` staleTime 5분**: 그래프 탭 진입 시 최신 엣지가
   지연될 수 있으나 엣지 생성 주기(데스크톱)를 고려하면 수용 범위. pull-to-refresh
   (digest 패턴의 QueryStateScrollView)는 스크롤 뷰 전용이라 그래프는 미적용 —
   필요 시 후속.
4. **Tab 5개 확장**: freezeOnBlur·lazy:false 유지 — 그래프 화면도 초기 마운트되므로
   layoutGraph가 가벼운지 중요(36노드 상한 — 이미 보장).
5. **push 금지**, 플랜 외 리팩터 금지.
