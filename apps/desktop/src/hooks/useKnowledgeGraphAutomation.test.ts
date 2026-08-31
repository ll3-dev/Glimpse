import { describe, expect, test } from 'bun:test';
import { shouldContinueGraphDrain } from './useKnowledgeGraphAutomation';

describe('shouldContinueGraphDrain', () => {
  test('0-edge여도 watermark를 저장한 배치는 다음 backlog를 이어서 처리한다', () => {
    expect(shouldContinueGraphDrain({ remainingBacklog: 2, processedCount: 8 })).toBe(true);
  });

  test('처리 진전이 없거나 backlog가 끝나면 멈춘다', () => {
    expect(shouldContinueGraphDrain({ remainingBacklog: 2, processedCount: 0 })).toBe(false);
    expect(shouldContinueGraphDrain({ remainingBacklog: 0, processedCount: 8 })).toBe(false);
  });
});
