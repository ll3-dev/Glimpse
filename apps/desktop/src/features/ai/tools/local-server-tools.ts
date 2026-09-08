/**
 * 로컬 서버 OpenAI-호환 tool-calling 왕복(round trip).
 *
 * 외부 로컬 서버(LM Studio·Ollama·llama.cpp 등)의 /chat/completions에
 * `tools` + `tool_choice: "auto"`를 붙인 비(非)스트리밍 요청 한 번을 보내고,
 * 응답이 tool_calls면 그 목록을, 아니면 최종 텍스트를 돌려준다.
 * 로컬 서버는 모두 OpenAI 포맷을 말하므로 별도 프로바이더 분기가 없다.
 *
 * 폴백 계약: 도구를 쓸 수 없거나(서버 미설정) 일시 실패하면 null을 돌려
 * 호출부(tool-loop)가 오늘의 일반 생성 경로로 되돌아가게 한다. 로컬 서버에는
 * 인증 경로가 없어 401/403 throw 분기도 없다 — 모든 실패는 null 폴백이다.
 */

import { fetchWithTimeout, type LocalServerProviderConfig } from '../providers/local-server-provider';
import { loadSettings } from '@/lib/settings-storage';
import type { ChatToolSchema } from './tool-schemas';

const TOOL_TIMEOUT_MS = 30_000;

/** 도구 호출 와이어 형식(OpenAI). */
export interface ToolCallWire {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** 왕복 결과 — 도구 호출이면 tool_calls, 아니면 최종 텍스트. */
export type ToolRoundResult =
  | { kind: 'tool_calls'; toolCalls: { id: string; name: string; arguments: string }[] }
  | { kind: 'text'; text: string };

export type ToolChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCallWire[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export async function completeLocalServerWithTools(
  messages: ToolChatMessage[],
  tools: ChatToolSchema[],
  config?: LocalServerProviderConfig,
): Promise<ToolRoundResult | null> {
  const settings = loadSettings();
  const baseUrl = (config?.baseUrl ?? settings.localServer.baseUrl).trim().replace(/\/+$/, '');
  if (!baseUrl) return null;

  const model = config?.model ?? settings.localServer.model;
  const fetchFn = config?.fetchFn ?? fetch;
  const timeoutMs = config?.timeoutMs ?? TOOL_TIMEOUT_MS;

  try {
    const { response, timedOut } = await fetchWithTimeout(
      fetchFn,
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(model ? { model } : {}),
          messages,
          tools,
          tool_choice: 'auto',
          max_tokens: 1024,
          temperature: 0.7,
        }),
      },
      timeoutMs,
    );
    if (timedOut || !response) {
      console.warn(`[local-server-tools] tool round timed out after ${timeoutMs}ms; falling back`);
      return null;
    }
    if (!response.ok) {
      console.warn(`[local-server-tools] tool round failed with status ${response.status}; falling back`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: {
            id?: string;
            function?: { name?: string; arguments?: string };
          }[];
        };
      }[];
    };
    const message = data.choices?.[0]?.message;
    const toolCalls = (message?.tool_calls ?? [])
      .filter((call) => call.function?.name)
      .map((call) => ({
        id: call.id ?? '',
        name: call.function?.name ?? '',
        arguments: call.function?.arguments ?? '{}',
      }));
    if (toolCalls.length > 0) {
      return { kind: 'tool_calls', toolCalls };
    }
    return { kind: 'text', text: message?.content ?? '' };
  } catch (error) {
    console.warn('[local-server-tools] tool round failed; falling back:', error);
    return null;
  }
}
