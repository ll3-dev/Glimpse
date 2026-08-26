import { describe, expect, mock, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { EDGE_PROPOSAL_LIMITS, proposeEdgesWithAI } from './proposeEdgesWithAI';

function item(id: string, title: string): KnowledgeItem {
  return {
    id,
    type: 'note',
    title,
    body: null,
    url: null,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: null,
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: 1,
    updatedAt: 1,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

function chatResult(text: string) {
  return { success: true as const, data: text };
}

describe('proposeEdgesWithAI', () => {
  test('returns parsed, sanitized edges from a capable target', async () => {
    const edges = await proposeEdgesWithAI([item('a', 'A'), item('b', 'B'), item('c', 'C')], {
      resolveTarget: () => ({ kind: 'local' }),
      executeChat: mock(async () =>
        chatResult(
          '설명 텍스트... [{"itemAId":"a","itemBId":"b","reason":"같은 프로젝트"},' +
            '{"itemAId":"a","itemBId":"a","reason":"self loop"},' +
            '{"itemAId":"a","itemBId":"ghost","reason":"unknown id"},' +
            '{"itemAId":"b","itemAId":"b","reason":"dup"}]',
        ),
      ) as never,
    });

    expect(edges).toEqual([{ itemAId: 'a', itemBId: 'b', reason: '같은 프로젝트' }]);
  });

  test('returns empty when the target cannot generate', async () => {
    const executeChat = mock(async () => chatResult('[{"itemAId":"a","itemBId":"b","reason":"x"}]'));
    for (const kind of ['stub', 'rules', 'apple']) {
      const edges = await proposeEdgesWithAI([item('a', 'A'), item('b', 'B')], {
        resolveTarget: () => ({ kind }),
        executeChat: executeChat as never,
      });
      expect(edges).toEqual([]);
    }
    expect(executeChat).not.toHaveBeenCalled();
  });

  test('returns empty when generation fails or throws', async () => {
    const failing = await proposeEdgesWithAI([item('a', 'A'), item('b', 'B')], {
      resolveTarget: () => ({ kind: 'byok' }),
      executeChat: async () => ({ success: false, error: new Error('boom') }),
    });
    expect(failing).toEqual([]);

    const throwing = await proposeEdgesWithAI([item('a', 'A'), item('b', 'B')], {
      resolveTarget: () => ({ kind: 'byok' }),
      executeChat: async () => {
        throw new Error('network down');
      },
    });
    expect(throwing).toEqual([]);
  });

  test('prompt wraps item data in an XML delimiter with an ignore-instructions note', async () => {
    let captured = '';
    await proposeEdgesWithAI([item('a', 'A'), item('b', 'B')], {
      resolveTarget: () => ({ kind: 'local' }),
      executeChat: mock(async (_target: unknown, input: { userText: string }) => {
        captured = input.userText;
        return chatResult('[{"itemAId":"a","itemBId":"b","reason":"x"}]');
      }) as never,
    });

    expect(captured).toContain('<knowledge_items>');
    expect(captured).toContain('</knowledge_items>');
    // The data section is declared untrusted.
    expect(captured).toMatch(/무시/);
    // Delimiter opens after the instructions, and the payload sits inside it.
    const openIndex = captured.indexOf('<knowledge_items>');
    const closeIndex = captured.indexOf('</knowledge_items>');
    expect(openIndex).toBeGreaterThan(0);
    expect(closeIndex).toBeGreaterThan(openIndex);
    expect(captured.slice(openIndex, closeIndex)).toContain('"id":"a"');
  });

  test('input budget stays within the 2048-context preset (12 items x 160 chars)', () => {
    expect(EDGE_PROPOSAL_LIMITS.MAX_INPUT_ITEMS).toBe(12);
    // 12 items x 160-char excerpts keeps the full prompt inside the budget.
    const items = Array.from({ length: EDGE_PROPOSAL_LIMITS.MAX_INPUT_ITEMS }, (_, i) =>
      item(`id-${i}`, `T${i}`),
    );
    for (const entry of items) entry.body = 'x'.repeat(500);
    let promptLength = 0;
    proposeEdgesWithAI(items, {
      resolveTarget: () => ({ kind: 'local' }),
      executeChat: mock(async (_t: unknown, input: { userText: string }) => {
        promptLength = input.userText.length;
        return chatResult('[]');
      }) as never,
    });
    // Instructions + 12x160 excerpts: measured ~3k chars ≈ 750-850 tokens,
    // roughly 40% of the 2048-token preset. The ceiling guards against the
    // old 20x200 blowup (~4.5k chars) rather than exact sizing.
    expect(promptLength).toBeLessThanOrEqual(4100);
  });
});
