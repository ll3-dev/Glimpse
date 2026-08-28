export type ReminderLocale = 'ko' | 'en';

/** 0개면 null — 호출부는 알림을 발화하지 않는다. */
export function buildReminderMessage(locale: ReminderLocale, dueCount: number): string | null {
  if (dueCount <= 0) return null;
  if (locale === 'ko') return `복습할 항목 ${dueCount}개가 기다리고 있어요`;
  return `${dueCount} item${dueCount === 1 ? ' is' : 's are'} waiting for review`;
}
