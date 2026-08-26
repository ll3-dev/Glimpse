import { describe, expect, mock, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { proposeEdgesWithAI } from './proposeEdgesWithAI';

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
});
