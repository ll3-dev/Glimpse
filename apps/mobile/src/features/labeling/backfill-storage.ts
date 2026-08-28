import { storage, StorageKeys } from '@/src/lib/storage';
import type { LabelingBackfillStorage } from '@glimpse/hooks';

/**
 * 라벨링 백필 완료 플래그 — 앱 설정과 같은 MMKV 인스턴스에 기록한다.
 * setNumber 계약은 storage.set(key, number)로 충족된다.
 */
export const mobileBackfillStorage: LabelingBackfillStorage = {
  getCompletedBackfillVersion: () => storage.getNumber(StorageKeys.LABELING_BACKFILL_VERSION) ?? 0,
  setCompletedBackfillVersion: (version: number) => {
    storage.set(StorageKeys.LABELING_BACKFILL_VERSION, version);
  },
};
