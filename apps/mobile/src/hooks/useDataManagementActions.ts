import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import type { DataImportSummary } from '@glimpse/shared';
import { mobileCoreClient } from '@/src/features/core/mobile-core-client';
import { storage, StorageKeys } from '@/src/lib/storage';

export type DataAction = 'export' | 'import' | 'delete';

export function useDataManagementActions() {
  const queryClient = useQueryClient();
  const [busyAction, setBusyAction] = useState<DataAction | null>(null);

  const refreshQueries = useCallback(async () => {
    storage.remove(StorageKeys.RECOMMENDATION_LAST_REFRESH_AT);
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const exportToClipboard = useCallback(async (): Promise<void> => {
    setBusyAction('export');
    try {
      const dataJson = await mobileCoreClient.exportData();
      await Clipboard.setStringAsync(dataJson);
    } finally {
      setBusyAction(null);
    }
  }, []);

  const importFromClipboard = useCallback(async (): Promise<DataImportSummary> => {
    setBusyAction('import');
    try {
      const dataJson = (await Clipboard.getStringAsync()).trim();
      if (!dataJson) {
        throw new Error('클립보드에 가져올 Glimpse JSON 데이터가 없습니다.');
      }
      const summary = await mobileCoreClient.importData(dataJson);
      await refreshQueries();
      return summary;
    } finally {
      setBusyAction(null);
    }
  }, [refreshQueries]);

  const deleteAllData = useCallback(async (): Promise<void> => {
    setBusyAction('delete');
    try {
      await mobileCoreClient.deleteAllData();
      await refreshQueries();
    } finally {
      setBusyAction(null);
    }
  }, [refreshQueries]);

  return {
    busyAction,
    exportToClipboard,
    importFromClipboard,
    deleteAllData,
  };
}
