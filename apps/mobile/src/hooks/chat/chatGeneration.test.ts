import { describe, expect, test } from 'bun:test';
import { generateAssistantReply, savePartialAssistantReply } from './chatGeneration';
import type { LocalLLMRuntime } from '@/src/features/ai/local-llm';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';

/**
 * 채팅 생성 저장 경로의 이중 저장 방지 검증.
 *
 * 과거 결함: abortAndSave 가 stopGeneration 후 부분 저장을 하고,
 * stopCompletion 이 generateStream 을 부분 텍스트로 resolve 시켜
 * generateAssistantReply 의 저장 경로도 실행되어 어시스턴트
 * 메시지가 2개 저장됐다.
 */

function createRuntime(opts: {
  resolveDelay?: number;
  streamText?: string;
}): { runtime: LocalLLMRuntime; startGeneration: () => void } {
  let releaseGeneration: (() => void) | null = null;

  const runtime = {
    buildChatPrompt: () => 'prompt',
    generateStream: async () => {
      // stopCompletion 처럼: abort 호출 후 부분 텍스트로 resolve
      await new Promise<void>((resolve) => {
        releaseGeneration = resolve;
      });
      return { text: opts.streamText ?? '부분 응답', stopReason: 'aborted' };
    },
    stopGeneration: async () => {
      releaseGeneration?.();
    },
  } as unknown as LocalLLMRuntime;

  return { runtime, startGeneration: () => releaseGeneration?.() };
}

const MODEL = { id: 'm', name: 'M', family: 'qwen-chatml', size: 1, downloaded: true } as LocalModel;

describe('chat generation 저장 경로', () => {
  test('abort 후 resolve 되면 assistant 저장은 한 번만 발생한다', async () => {
    const saved: { role: string; content: string }[] = [];
    const addMessage = async (input: { role: 'user' | 'assistant'; content: string }) => {
      saved.push({ role: input.role, content: input.content });
    };

    const { runtime } = createRuntime({ streamText: '부분 응답' });

    let current = true;
    const isCurrent = () => current;

    const generationPromise = generateAssistantReply({
      runtime,
      model: MODEL,
      conversationId: 'c1',
      userText: '질문',
      addMessage,
      streamingTextRef: { current: '부분' },
      onToken: () => {},
      isCurrent,
    });

    // abortAndSave 시뮬레이션: 세대 무효화 + 부분 저장
    current = false;
    await savePartialAssistantReply({
      conversationId: 'c1',
      addMessage,
      partialText: '부분',
    });
    await runtime.stopGeneration();
    await generationPromise;

    const assistantMessages = saved.filter((m) => m.role === 'assistant');
    expect(assistantMessages.length).toBe(1); // abort 저장만
    expect(assistantMessages[0].content).toBe('부분');
  });

  test('정상 완료 시(세대 유효) assistant 저장이 발생한다', async () => {
    const saved: { role: string; content: string }[] = [];
    const addMessage = async (input: { role: 'user' | 'assistant'; content: string }) => {
      saved.push({ role: input.role, content: input.content });
    };

    const runtime = {
      buildChatPrompt: () => 'prompt',
      generateStream: async () => ({ text: '완전한 응답', stopReason: 'completed' }),
      stopGeneration: async () => {},
    } as unknown as LocalLLMRuntime;

    await generateAssistantReply({
      runtime,
      model: MODEL,
      conversationId: 'c2',
      userText: '질문',
      addMessage,
      streamingTextRef: { current: '' },
      onToken: () => {},
      isCurrent: () => true,
    });

    const assistantMessages = saved.filter((m) => m.role === 'assistant');
    expect(assistantMessages.length).toBe(1);
    expect(assistantMessages[0].content).toBe('완전한 응답');
  });

  test('빈 부분 텍스트는 저장하지 않는다', async () => {
    const saved: { role: string }[] = [];
    const addMessage = async (input: { role: 'user' | 'assistant' }) => {
      saved.push({ role: input.role });
    };

    await savePartialAssistantReply({
      conversationId: 'c3',
      addMessage,
      partialText: '   ',
    });

    expect(saved.filter((m) => m.role === 'assistant').length).toBe(0);
  });
});
