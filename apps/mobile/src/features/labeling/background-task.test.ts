import { describe, expect, test, mock, beforeEach } from 'bun:test';
import * as TaskManager from 'expo-task-manager';
import {
  LABELING_BACKGROUND_TASK,
  ensureLabelingBackgroundTaskRegistered,
} from './background-task';
import {
  acquireLocalLLMKeepAlive,
  hasLocalLLMKeepAlive,
  releaseLocalLLMKeepAlive,
} from '@/src/features/ai/local-llm/background-keepalive';

/**
 * 태스크 실행 본문이 keep-alive 안에서 돌아가는지 검증.
 *
 * 과거 결함: 백그라운드 작업이 로컬 LLM을 쓰는 동안 언로드 타이머가
 * 그대로 실행되어 작업이 끊겼다. defineTask 본문이 acquire/release로
 * 감싸야 keep-alive 보류가 동작한다.
 *
 * keep-alive 모듈은 실제 구현을 그대로 쓰고, 태스크 본문 전후로
 * 관찰해서 검증한다 (모듈 목자체를 대체하면 다른 테스트 파일까지 새어나간다).
 * 라벨링 본문만 상대 경로로 스텁한다 — 스토어/네트워크 의존 제거용.
 */

const runLabelingMock = mock(async () => ({ success: true as const, data: { processedCount: 0, items: [] } }));
mock.module('./runForegroundLabeling', () => ({
  runForegroundLabeling: runLabelingMock,
}));

type DefinedTask = () => Promise<number>;
const definedTasks = (TaskManager as unknown as { __definedTasks: Map<string, DefinedTask> })
  .__definedTasks;

beforeEach(() => {
  runLabelingMock.mockClear();
  // 모듈 레벨 카운터를 안전한 상태로 정리
  while (hasLocalLLMKeepAlive()) {
    releaseLocalLLMKeepAlive();
  }
});

describe('ensureLabelingBackgroundTaskRegistered', () => {
  test('registers the labeling task when available', async () => {
    await TaskManager.unregisterTaskAsync(LABELING_BACKGROUND_TASK);

    const result = await ensureLabelingBackgroundTaskRegistered(15);

    expect(result.registered).toBe(true);
    expect(await TaskManager.isTaskRegisteredAsync(LABELING_BACKGROUND_TASK)).toBe(true);
  });
});

describe('labeling background task body', () => {
  test('runs the task with keep-alive held, released afterwards', async () => {
    const task = definedTasks.get(LABELING_BACKGROUND_TASK);
    expect(task).toBeDefined();

    const hasBefore = hasLocalLLMKeepAlive();
    let hasDuringTask: boolean | null = null;
    runLabelingMock.mockImplementation(async () => {
      hasDuringTask = hasLocalLLMKeepAlive();
      return { success: true as const, data: { processedCount: 0, items: [] } };
    });

    const result = await task!();

    expect(result).toBe(1); // BackgroundTaskResult.Success
    expect(hasBefore).toBe(false);
    expect<boolean | null>(hasDuringTask).toBe(true);
    expect(hasLocalLLMKeepAlive()).toBe(false);
  });

  test('releases keep-alive even when labeling throws', async () => {
    const task = definedTasks.get(LABELING_BACKGROUND_TASK)!;

    runLabelingMock.mockImplementation(async () => {
      throw new Error('labeling crashed');
    });

    await expect(task!()).rejects.toThrow('labeling crashed');
    expect(hasLocalLLMKeepAlive()).toBe(false);
  });

  test('실제 acquire/release가 카운터를 통해 균형을 이룬다', () => {
    acquireLocalLLMKeepAlive();
    expect(hasLocalLLMKeepAlive()).toBe(true);
    releaseLocalLLMKeepAlive();
    expect(hasLocalLLMKeepAlive()).toBe(false);
  });
});
