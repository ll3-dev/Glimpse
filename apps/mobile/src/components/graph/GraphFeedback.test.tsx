import { describe, expect, mock, test } from "bun:test";
import type { GraphDiscovery } from "@glimpse/features";
import type { GraphEdge, GraphNode } from "@glimpse/shared";
import { createElement, type ComponentType, type ReactNode } from "react";

type NativeHostProps = Record<string, unknown> & {
  accessibilityLabel?: string;
  accessibilityRole?: string;
  children?: ReactNode;
  onPress?: () => void;
};

function nativeHost(tag: "button" | "div" | "span") {
  return function NativeHost({
    accessibilityLabel,
    accessibilityRole,
    children,
    numberOfLines: _numberOfLines,
    onPress,
    ...props
  }: NativeHostProps) {
    return createElement(
      tag,
      {
        ...props,
        "aria-label": accessibilityLabel,
        onClick: onPress,
        role: accessibilityRole,
      },
      children,
    );
  };
}

mock.module("react-native", () => ({
  Pressable: nativeHost("button"),
  Text: nativeHost("span"),
  View: nativeHost("div"),
}));

const Icon = () => createElement("span");
mock.module("lucide-react-native", () => ({
  Check: Icon,
  ChevronRight: Icon,
  Clock: Icon,
  EyeOff: Icon,
  Sparkles: Icon,
  X: Icon,
}));
mock.module("@glimpse/ui", () => ({
  useSemanticColor: (_name: string) => "gray",
}));

const { renderToStaticMarkup } = await import("react-dom/server");
const { GraphDiscoveryCard } = await import("./GraphDiscoveryCard");
const { GraphEdgeInspector } = await import("./GraphEdgeInspector");

const itemA = {
  id: "a",
  type: "note" as const,
  title: "지식 항목 에이",
  body: "첫 항목",
  tags: ["테스트"],
  createdAt: 1,
  updatedAt: 1,
};
const itemB = { ...itemA, id: "b", title: "지식 항목 비", body: "둘째 항목" };
const recommendation = {
  id: "rec-1",
  itemA_id: itemA.id,
  itemB_id: itemB.id,
  reason: "두 항목이 같은 테스트 태그를 공유합니다",
  status: "pending" as const,
  createdAt: 2,
  respondedAt: null,
};
const discovery: GraphDiscovery = {
  recommendation,
  itemA,
  itemB,
  kind: "new",
};

function renderComponent(
  component: ComponentType<never>,
  props: Record<string, unknown>,
) {
  return renderToStaticMarkup(
    createElement(component as ComponentType<Record<string, unknown>>, props),
  );
}

describe("모바일 그래프 무검수 피드백", () => {
  test("새 연결은 검수 버튼 없이 제목과 근거를 바로 보여준다", () => {
    const markup = renderComponent(GraphDiscoveryCard as ComponentType<never>, {
      discovery,
      onOpenItem: () => {},
      onFocus: () => {},
    });

    expect(markup).toContain("지식 항목 에이");
    expect(markup).toContain("지식 항목 비");
    expect(markup).toContain("두 항목이 같은 테스트 태그를 공유합니다");
    expect(markup).not.toContain("연결 수락");
    expect(markup).not.toContain("연결 무시");
    expect(markup).not.toContain("연결 나중에 보기");
  });

  test("연결 근거에는 잘못된 연결을 숨기는 단일 교정 동작만 둔다", () => {
    const source: GraphNode = { id: "a", label: "지식 항목 에이", x: 0, y: 0 };
    const target: GraphNode = { id: "b", label: "지식 항목 비", x: 1, y: 1 };
    const edge: GraphEdge = {
      id: recommendation.id,
      source,
      target,
      reason: recommendation.reason,
    };
    const markup = renderComponent(GraphEdgeInspector as ComponentType<never>, {
      edge,
      isResponding: false,
      onOpenNode: () => {},
      onHide: () => {},
      onClose: () => {},
    });

    expect(markup).toContain("이 연결 숨기기");
    expect(markup).not.toContain("선택한 연결 수락");
    expect(markup).not.toContain("선택한 연결 무시");
    expect(markup).not.toContain("선택한 연결 나중에 보기");
  });
});
