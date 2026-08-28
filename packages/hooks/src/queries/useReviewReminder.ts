import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient, type QueryCacheNotifyEvent } from '@tanstack/react-query';
import { useOptionalCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';
import {
  createReviewReminderController,
  DEFAULT_REMINDER_TIME,
  type ReviewReminderController,
  type ReviewReminderScheduler,
  type ReminderTime,
} from '@glimpse/features';

/** due 캐시 연속 변경을 하나의 refresh로 합치기 위한 trailing debounce. */
const DUE_CHANGE_DEBOUNCE_MS = 2000;

const consoleLogger = {
  error: (message: string, meta?: unknown) => console.error(message, meta),
};

/**
 * 복습 리마인더 공유 훅. 플랫폼 어댑터(scheduler)를 주입받아 사용.
 * - mount 시 저장된 설정으로 상태 복원
 * - 복습 due 캐시 변화 시 다음 발화 본문 갱신 (정확한 N 근사)
 */
export function useReviewReminderScheduler(
  scheduler: ReviewReminderScheduler | null,
  options: {
    enabled: boolean;
    time: ReminderTime;
    locale?: () => 'ko' | 'en';
  },
) {
  const coreClient = useOptionalCoreClient();
  const queryClient = useQueryClient();
  const controllerRef = useRef<ReviewReminderController | null>(null);
  const enabledRef = useRef(options.enabled);
  const timeRef = useRef(options.time);

  enabledRef.current = options.enabled;
  timeRef.current = options.time;

  useEffect(() => {
    if (!scheduler || !coreClient) return;
    const controller = createReviewReminderController({
      scheduler,
      getDueCount: async () => {
        const items = await coreClient.getDueKnowledgeItems({ now: Date.now(), limit: 50 });
        return items.length;
      },
      locale: options.locale,
      logger: consoleLogger,
    });
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
    };
    // scheduler/coreClient 변경시에만 재생성
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduler, coreClient]);

  // enabled 전이에 반응 — 저장된 설정이 마운트 후 hydrate되는 복원 경로도 커버한다.
  // 마운트 시점에 이미 enabled면 생성 effect 이후 이 effect가 활성화를 담당한다.
  useEffect(() => {
    if (!options.enabled) return;
    void controllerRef.current
      ?.enable(timeRef.current)
      .catch((error: unknown) => consoleLogger.error('review-reminder: 활성화 실패', error));
  }, [options.enabled, scheduler, coreClient]);

  useEffect(() => {
    const isDueItemsEvent = (event: QueryCacheNotifyEvent) => {
      const key = event.query.queryKey;
      return (
        key.length >= queryKeys.review.dueItems.length &&
        queryKeys.review.dueItems.every((part, i) => key[i] === part)
      );
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // 성공 갱신(쿼리 데이터 확정)에만 반응 — fetch 시작 이벤트는 무시
      if (event.type !== 'updated' || event.action?.type !== 'success') return;
      if (!isDueItemsEvent(event)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void controllerRef.current
          ?.refresh(timeRef.current)
          .catch((error: unknown) => consoleLogger.error('review-reminder: 갱신 실패', error));
      }, DUE_CHANGE_DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient]);

  const setEnabled = useCallback(async (next: boolean, time: ReminderTime) => {
    const controller = controllerRef.current;
    if (!controller) return false;
    if (next) return controller.enable(time);
    await controller.disable();
    return true;
  }, []);

  /** 현재 예약 상태 (설정 UI hydrate용). */
  const getStatus = useCallback(async () => {
    return scheduler?.getStatus() ?? { scheduled: false as const };
  }, [scheduler]);

  return { setEnabled, getStatus, defaultTime: DEFAULT_REMINDER_TIME };
}
