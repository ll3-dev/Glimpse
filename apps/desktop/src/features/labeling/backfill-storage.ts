import type { LabelingBackfillStorage } from '@glimpse/hooks';

const BACKFILL_VERSION_KEY = 'labeling_backfill_version';

/** 라벨링 백필 완료 플래그 — 데스크톱은 localStorage 기반(기존 settings-storage와 동일 방식). */
export const desktopBackfillStorage: LabelingBackfillStorage = {
  getCompletedBackfillVersion: () => {
    try {
      const raw = localStorage.getItem(BACKFILL_VERSION_KEY);
      const parsed = raw ? Number(raw) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  },
  setCompletedBackfillVersion: (version: number) => {
    try {
      localStorage.setItem(BACKFILL_VERSION_KEY, String(version));
    } catch {
      // 저장 실패 시 다음 시작에 재시도된다(플래그 미설정)
    }
  },
};
