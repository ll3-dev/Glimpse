import { describe, expect, test } from 'bun:test';
import * as TaskManager from 'expo-task-manager';
import {
  LABELING_BACKGROUND_TASK,
  ensureLabelingBackgroundTaskRegistered,
} from './background-task';

describe('ensureLabelingBackgroundTaskRegistered', () => {
  test('registers the labeling task when available', async () => {
    await TaskManager.unregisterTaskAsync(LABELING_BACKGROUND_TASK);

    const result = await ensureLabelingBackgroundTaskRegistered(15);

    expect(result.registered).toBe(true);
    expect(await TaskManager.isTaskRegisteredAsync(LABELING_BACKGROUND_TASK)).toBe(true);
  });
});
