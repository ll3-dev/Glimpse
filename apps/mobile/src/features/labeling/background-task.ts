import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import {
  BackgroundTaskResult,
  BackgroundTaskStatus,
} from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import {
  acquireLocalLLMKeepAlive,
  releaseLocalLLMKeepAlive,
} from '@/src/features/ai/local-llm/background-keepalive';
import { runForegroundLabeling } from './runForegroundLabeling';

export const LABELING_BACKGROUND_TASK = 'glimpse-labeling-background-task';
const DEFAULT_BACKGROUND_LABELING_INTERVAL_MINUTES = 60;
const DEFAULT_BACKGROUND_LABELING_BATCH_SIZE = 3;

export interface LabelingBackgroundTaskRegistrationResult {
  registered: boolean;
  reason:
    | 'registered'
    | 'already_registered'
    | 'task_manager_unavailable'
    | 'background_restricted'
    | 'web';
}

if (!TaskManager.isTaskDefined(LABELING_BACKGROUND_TASK)) {
  TaskManager.defineTask(LABELING_BACKGROUND_TASK, async () => {
    // 작업이 로컬 LLM을 사용하는 동안 백그라운드 언로드 타이머가
    // 실행되지 않도록 keep-alive를 보류한다. 종료 경로와 무관하게 해제된다.
    acquireLocalLLMKeepAlive();
    try {
      const result = await runForegroundLabeling(DEFAULT_BACKGROUND_LABELING_BATCH_SIZE);
      return result.success
        ? BackgroundTaskResult.Success
        : BackgroundTaskResult.Failed;
    } finally {
      releaseLocalLLMKeepAlive();
    }
  });
}

export async function ensureLabelingBackgroundTaskRegistered(
  minimumInterval: number = DEFAULT_BACKGROUND_LABELING_INTERVAL_MINUTES
): Promise<LabelingBackgroundTaskRegistrationResult> {
  if (Platform.OS === 'web') {
    return { registered: false, reason: 'web' };
  }

  const isTaskManagerAvailable = await TaskManager.isAvailableAsync();
  if (!isTaskManagerAvailable) {
    return { registered: false, reason: 'task_manager_unavailable' };
  }

  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTaskStatus.Available) {
    return { registered: false, reason: 'background_restricted' };
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LABELING_BACKGROUND_TASK);
  if (isRegistered) {
    return { registered: true, reason: 'already_registered' };
  }

  await BackgroundTask.registerTaskAsync(LABELING_BACKGROUND_TASK, {
    minimumInterval,
  });

  return { registered: true, reason: 'registered' };
}

export async function triggerLabelingBackgroundTaskForTesting(): Promise<boolean> {
  if (!__DEV__ || Platform.OS === 'web') {
    return false;
  }

  return BackgroundTask.triggerTaskWorkerForTestingAsync();
}
