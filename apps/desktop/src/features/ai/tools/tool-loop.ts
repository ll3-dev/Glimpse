/**
 * Chat tool-calling 루프.
 *
 * 이용 가능하면(OpenAI 호환 로컬 서버 + 설정 켜짐) 대화에 도구 스키마를 실어
 * 최대 MAX_TOOL_ROUNDS번 왕복하며 도구를 실행하고, 도구 기록(transcript)이
 * 포함된 최종 답변을 돌려준다. 이용 불가능하거나 왕복이 실패하면 null —
 * 호출부(ChatView)는 오늘의 RAG 생성 경로로 그대로 폴백한다.
 *
 * v1은 비(非)스트리밍 왕복이므로 최종 답변은 한 번에 전달된다(기존 비스트리밍
 * 폴백과 같은 단일 전달 방식). 도구를 아예 안 쓴 일반 질문도 같은 경로로
 * 답변된다 — 로컬 서버가 tools를 지원하면 토큰 스트리밍보다 도구 우선이다.
 */

import type { KnowledgeItem } from '@glimpse/shared';
import { embedForRag, createRagEmbedDeps } from '../embed-knowledge-batch';
import { createRustraCoreClient } from '@/features/core/rustra-core-client';
import { loadSettings } from '@/lib/settings-storage';
import { createToolExecutor, type KnowledgeToolDeps } from './tool-definitions';
import { CHAT_TOOL_SCHEMAS } from './tool-schemas';
import {
  completeLocalServerWithTools,
  type ToolChatMessage,
  type ToolRoundResult,
} from './local-server-tools';

export const MAX_TOOL_ROUNDS = 4;

const TOOL_SYSTEM_PROMPT = `You are the Glimpse knowledge assistant. You can read and search the user's local knowledge library and save notes when explicitly asked.
- For questions about the user's stored knowledge, call search_knowledge or list_recent_knowledge instead of guessing.
- Only call save_note when the user explicitly asks to save something.
- Answer in the user's language (usually Korean). Ground answers in tool results and cite item titles when relevant.`;

export interface ToolRunRecord {
  name: string;
  arguments: string;
  result: unknown;
}

export interface ToolLoopResult {
  text: string;
  toolRuns: ToolRunRecord[];
}

export interface ToolLoopDeps {
  isAvailable: () => boolean;
  roundTrip: (messages: ToolChatMessage[]) => Promise<ToolRoundResult | null>;
  callTool: (name: string, argsJson: string) => Promise<unknown>;
}

/**
 * 기본 지식 deps — chat-generation의 defaultChatKnowledgeDeps와 같은 지연
 * 생성 패턴. 저장은 rustra 코어 클라이언트로 직행한다.
 */
export const defaultKnowledgeToolDeps: KnowledgeToolDeps = {
  loadLibrary: (() => {
    let client: ReturnType<typeof createRustraCoreClient> | null = null;
    return async () => {
      client ??= createRustraCoreClient();
      return client.listKnowledgeItems();
    };
  })(),
  saveKnowledgeItem: (() => {
    let client: ReturnType<typeof createRustraCoreClient> | null = null;
    return async (item: KnowledgeItem) => {
      client ??= createRustraCoreClient();
      return client.saveKnowledgeItem(item);
    };
  })(),
  embed: (question, texts) => embedForRag(question, texts, createRagEmbedDeps()),
  generateId: () => crypto.randomUUID(),
};

/** 기본 루프 deps — 설정 기반 가용성 + 로컬 서버 왕복 + 도구 실행기. */
export const defaultToolLoopDeps: ToolLoopDeps = {
  isAvailable: () => {
    const settings = loadSettings();
    return (
      settings.aiProvider === 'local-server' &&
      settings.localServer.baseUrl.trim().length > 0 &&
      settings.chat.toolsEnabled !== false
    );
  },
  roundTrip: (messages) => completeLocalServerWithTools(messages, CHAT_TOOL_SCHEMAS),
  callTool: createToolExecutor(defaultKnowledgeToolDeps),
};

/**
 * 도구 지원 채팅 생성. 도구를 쓸 수 없으면 null, 도구 왕복이 실패해도
 * null(호출부 폴백). 빈 응답은 가짜 답변으로 포장하지 않고 reject 한다
 * (router.ts의 기존 계약과 동일).
 */
export async function runToolCallingChat(
  messages: { role: string; content: string }[],
  deps: ToolLoopDeps = defaultToolLoopDeps,
): Promise<ToolLoopResult | null> {
  if (!deps.isAvailable()) return null;

  const conversation: ToolChatMessage[] = [
    { role: 'system', content: TOOL_SYSTEM_PROMPT },
    ...messages.map((message) => ({
      role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: message.content,
    })),
  ];
  const toolRuns: ToolRunRecord[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await deps.roundTrip(conversation);
    if (result === null) return null;

    if (result.kind === 'text') {
      const text = result.text.trim();
      if (!text) {
        throw new Error('AI 응답이 비어 있습니다. 설정에서 다른 프로바이더를 선택해 주세요.');
      }
      return { text, toolRuns };
    }

    // 도구 실행 — 실패한 도구는 {error} 결과로 기록해 모델이 회복하게 한다.
    conversation.push({
      role: 'assistant',
      content: null,
      tool_calls: result.toolCalls.map((call) => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.arguments },
      })),
    });
    for (const call of result.toolCalls) {
      let outcome: unknown;
      try {
        outcome = await deps.callTool(call.name, call.arguments);
      } catch (error) {
        outcome = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
      toolRuns.push({ name: call.name, arguments: call.arguments, result: outcome });
      conversation.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(outcome),
      });
    }
  }

  // 라운드를 모두 소진하고도 최종 답변이 없다 — 폴백이 재시도하게 null.
  return null;
}

/** search_knowledge 실행 기록에서 참조 카드용 (itemId, title)을 뽑는다. */
export function searchReferencesFromToolRuns(
  toolRuns: ToolRunRecord[],
): { itemId: string; title: string }[] {
  const references: { itemId: string; title: string }[] = [];
  for (const run of toolRuns) {
    if (run.name !== 'search_knowledge') continue;
    const result = run.result as { items?: { id: string; title: string | null }[] } | null;
    for (const item of result?.items ?? []) {
      if (!references.some((ref) => ref.itemId === item.id)) {
        references.push({ itemId: item.id, title: item.title ?? '제목 없음' });
      }
    }
  }
  return references;
}
