import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import { BackgroundTaskResult, BackgroundTaskStatus } from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { initializeCoreClient } from '@/src/features/core/initialize-core-client';
import { logger } from '@/src/utils/logger';
import { getSyncConfig } from './sync-store';
import { syncWithDesktop } from './sync-client';

export const SYNC_BACKGROUND_TASK = 'glimpse-desktop-sync-background-task';
const MINIMUM_INTERVAL_MINUTES = 15;

if (!TaskManager.isTaskDefined(SYNC_BACKGROUND_TASK)) {
  TaskManager.defineTask(SYNC_BACKGROUND_TASK, async () => {
    if (!getSyncConfig().desktopDeviceId || !getSyncConfig().autoSync) {
      return BackgroundTaskResult.Success;
    }
    // A rejected pairing token or an active failure backoff is an expected
    // state, not a task failure — reporting Failed would just make the OS
    // retry an unrecoverable request every 15 minutes.
    const { isSyncInBackoff } = await import('./sync-client');
    if (isSyncInBackoff()) {
      return BackgroundTaskResult.Success;
    }
    try {
      await initializeCoreClient();
      await syncWithDesktop();
      return BackgroundTaskResult.Success;
    } catch (error) {
      logger.warn('Background sync failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return BackgroundTaskResult.Failed;
    }
  });
}

export async function ensureSyncBackgroundTaskRegistered(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!(await TaskManager.isAvailableAsync())) return false;
  if ((await BackgroundTask.getStatusAsync()) !== BackgroundTaskStatus.Available) return false;
  if (await TaskManager.isTaskRegisteredAsync(SYNC_BACKGROUND_TASK)) return true;
  await BackgroundTask.registerTaskAsync(SYNC_BACKGROUND_TASK, {
    minimumInterval: MINIMUM_INTERVAL_MINUTES,
  });
  return true;
}
