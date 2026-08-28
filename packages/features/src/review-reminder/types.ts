export interface ReviewReminderScheduler {
  /** 알림 권한 요청. granted 여부 반환. */
  requestPermission(): Promise<boolean>;
  /** 하루 1회 알림 예약. 기존 예약은 교체(단일 트리거 유지). body는 발화 시점 개수. */
  scheduleDaily(time: { hour: number; minute: number }, body: string): Promise<void>;
  /** 예약 취소. */
  cancel(): Promise<void>;
  /** 현재 예약 상태 (설정 UI 표시용). */
  getStatus(): Promise<{ scheduled: boolean; hour?: number; minute?: number }>;
}

export interface ReviewReminderControllerDeps {
  scheduler: ReviewReminderScheduler;
  getDueCount: () => Promise<number>;
  locale?: () => 'ko' | 'en';
}
