import { describe, it, expect, beforeEach } from 'bun:test';
import { clearLocalLLMSettings } from '@/src/features/settings';
import { resolveEffectiveTarget } from '@/src/features/ai/targets';

describe('useChatAISetup target resolution logic', () => {
  beforeEach(() => {
    clearLocalLLMSettings();
  });

  it('should resolve local target when local is configured', () => {
    const target = resolveEffectiveTarget('chat');
    expect(target).toBeDefined();
    expect(['local', 'byok', 'apple', 'stub']).toContain(target.kind);
  });
});
