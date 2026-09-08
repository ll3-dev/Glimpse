import { describe, expect, mock, test } from 'bun:test';
import {
  MAX_TOOL_ROUNDS,
  runToolCallingChat,
  searchReferencesFromToolRuns,
  type ToolLoopDeps,
} from './tool-loop';
import type { ToolRoundResult } from './local-server-tools';

function toolCallsRound(...calls: { id: string; name: string; arguments: string }[]): ToolRoundResult {
  return { kind: 'tool_calls', toolCalls: calls };
}

function makeDeps(rounds: ToolRoundResult[], overrides?: Partial<ToolLoopDeps>) {
  const roundTrip = mock(async () => rounds.shift() ?? null);
  const callTool = mock(async (name: string) => ({ items: name === 'search_knowledge' ? [{ id: 'item-1', title: '참고 노트' }] : [] }));
  const deps: ToolLoopDeps = {
    isAvailable: () => true,
    roundTrip,
    callTool,
    ...overrides,
  };
  return { deps, roundTrip, callTool };
}

describe('runToolCallingChat', () => {
  test('executes requested tools once, feeds results back, returns the final text', async () => {
    const { deps, roundTrip, callTool } = makeDeps([
      toolCallsRound({ id: 'call-1', name: 'search_knowledge', arguments: '{"query":"rust"}' }),
      { kind: 'text', text: 'rust 노트를 찾았습니다' },
    ]);

    const result = await runToolCallingChat([{ role: 'user', content: 'rust 정리해줘' }], deps);

    expect(result?.text).toBe('rust 노트를 찾았습니다');
    expect(result?.toolRuns).toHaveLength(1);
    expect(result?.toolRuns[0].name).toBe('search_knowledge');
    expect(callTool).toHaveBeenCalledTimes(1);
    expect(roundTrip).toHaveBeenCalledTimes(2);

    // 두 번째 왕복에는 assistant tool_calls 메시지와 tool 결과가 실려 있다.
    const secondCall = roundTrip.mock.calls[1][0] as {
      role: string;
      tool_call_id?: string;
      content?: string;
    }[];
    expect(secondCall.some((m) => m.role === 'assistant' && 'tool_calls' in m)).toBe(true);
    expect(
      secondCall.some((m) => m.role === 'tool' && m.tool_call_id === 'call-1'),
    ).toBe(true);
  });

  test('returns null when unavailable so the caller falls back', async () => {
    const { deps, roundTrip } = makeDeps([{ kind: 'text', text: 'unused' }], {
      isAvailable: () => false,
    });

    expect(await runToolCallingChat([{ role: 'user', content: 'hi' }], deps)).toBeNull();
    expect(roundTrip).not.toHaveBeenCalled();
  });

  test('a failed round trip (null) falls back without running tools', async () => {
    const { deps, callTool } = makeDeps([null]);

    expect(await runToolCallingChat([{ role: 'user', content: 'hi' }], deps)).toBeNull();
    expect(callTool).not.toHaveBeenCalled();
  });

  test('a throwing tool becomes an {error} tool result and the loop continues', async () => {
    const { deps, callTool } = makeDeps([
      toolCallsRound({ id: 'call-1', name: 'save_note', arguments: '{"body":"x"}' }),
      { kind: 'text', text: '저장에 실패해 안내합니다' },
    ]);
    callTool.mockImplementation(async () => {
      throw new Error('db locked');
    });

    const result = await runToolCallingChat([{ role: 'user', content: '저장해줘' }], deps);

    expect(result?.text).toBe('저장에 실패해 안내합니다');
    expect(result?.toolRuns[0].result).toEqual({ error: 'db locked' });
  });

  test('empty final text is rejected, not packaged as a fake answer', async () => {
    const { deps } = makeDeps([{ kind: 'text', text: '   ' }]);
    await expect(
      runToolCallingChat([{ role: 'user', content: 'hi' }], deps),
    ).rejects.toThrow('AI 응답이 비어 있습니다');
  });

  test('gives up after the round budget and falls back', async () => {
    const endless = { kind: 'tool_calls' as const, toolCalls: [{ id: 'c', name: 'search_knowledge', arguments: '{}' }] };
    const { deps, roundTrip } = makeDeps(
      Array.from({ length: MAX_TOOL_ROUNDS + 2 }, () => endless),
    );

    expect(await runToolCallingChat([{ role: 'user', content: 'hi' }], deps)).toBeNull();
    expect(roundTrip).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
  });
});

describe('searchReferencesFromToolRuns', () => {
  test('collects deduped item references from search runs only', () => {
    const runs = [
      {
        name: 'search_knowledge',
        arguments: '{}',
        result: { items: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] },
      },
      {
        name: 'search_knowledge',
        arguments: '{}',
        result: { items: [{ id: 'a', title: 'A' }, { id: 'c', title: null }] },
      },
      { name: 'save_note', arguments: '{}', result: { id: 'x', saved: true } },
    ];

    expect(searchReferencesFromToolRuns(runs)).toEqual([
      { itemId: 'a', title: 'A' },
      { itemId: 'b', title: 'B' },
      { itemId: 'c', title: '제목 없음' },
    ]);
  });
});
