# 핵심 루프 완성 구현 계획 (복습 리마인더 · 라벨링 백필 · AI 미설정 경험)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 제품의 핵심 약속("적절한 타이밍에 다시 꺼내주기")을 작동게 만든다 — 하루 1회 요약형 복습 리마인더(모바일+데스크톱), 라벨링 백필, AI 미설정 경험 개선.

**Architecture:** 공유 코어(`packages/features`, `packages/hooks`) + 얇은 플랫폼 어댑터(모바일 expo-notifications / 데스크톱 Tauri notification 플러그인). 기존 `create-rustra-core-client`의 "공유 팩토리 + 양앱 씬 래퍼" 패턴 재적용. 설계 근거는 `docs/plans/2026-08-28-core-loop-completion-design.md`.

**Tech Stack:** TypeScript(공유 코어, 순수 함수), zustand vanilla store, TanStack Query, expo-notifications(모바일), @tauri-apps/plugin-notification + tauri-plugin-notification(데스크톱), bun test.

**검증 커맨드:** `bun test <file>`, `bun run lint`, `cd apps/mobile && npx tsc --noEmit`, `cd apps/desktop && npx tsc --noEmit`

---

## 사전 참고사항 (구현자용 컨텍스트)

- `KnowledgeItem` 타입은 `@glimpse/shared` (`packages/bridge-rust/generated/types.ts` 생성). `labelStatus`는 `'pending' | 'provisional' | ... | null`, `labelRequestedAt: number | null`.
- 코어 클라이언트 인터페이스 `CoreClient`는 `packages/shared/src/index.ts`에서 익스포트. 필요한 메서드: `listKnowledgeItems()`, `updateKnowledgeItem(id, patch)`, `getDueKnowledgeItems({now, limit})`.
- 공유 훅은 `packages/hooks/src/queries|mutations/`에 있고 `useCoreClient()`로 클라이언트를 얻는다 (`packages/hooks/src/core-client-context.tsx`).
- 모바일 설정 저장소: `KeyValueStorage` 계약(`apps/mobile/src/lib/storage.shared.ts`) + `StorageKeys`. zustand vanilla store 패턴은 `apps/mobile/src/stores/settings/appleIntelligence.store.ts` 참고.
- 데스크톱에는 모바일과 동일한 ai-targets 스토어가 없다. 데스크톱 AI 라우터(`apps/desktop/src/features/ai/router.ts`)는 자체 폴백 체인(configured provider → rules → stub)을 가진다.
- 설정 섹션 UI 패턴: `apps/mobile/src/components/settings/SettingsSection.tsx` + `LanguageSection.tsx`. 로캘 메시지: `apps/mobile/src/localization/catalog.ts` (ko/en).
- 토스트(모바일): `import { toast } from '@/src/stores/toast.store'`.
- 테스트 실행은 저장소 루트에서 `bun test <path>`.

---

# 파트 A — 복습 리마인더 (크로스플랫폼)

### Task A1: 공유 코어 — 스케줄 순수 로직

**Files:**
- Create: `packages/features/src/review-reminder/schedule.ts`
- Create: `packages/features/src/review-reminder/schedule.test.ts`

**Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'bun:test';
import { computeNextFireAt, shouldReschedule } from './schedule';

const HOUR = 60 * 60 * 1000;

describe('computeNextFireAt', () => {
  it('returns today 21:00 when now is before the hour', () => {
    // 2026-08-28T10:00 local
    const now = new Date(2026, 7, 28, 10, 0, 0).getTime();
    const fire = computeNextFireAt(now, 21, 0);
    const d = new Date(fire);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([28, 21, 0]);
    expect(fire).toBeGreaterThan(now);
  });

  it('returns tomorrow 21:00 when today slot has passed', () => {
    const now = new Date(2026, 7, 28, 22, 0, 0).getTime();
    const fire = computeNextFireAt(now, 21, 0);
    const d = new Date(fire);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([29, 21, 0]);
  });
});

describe('shouldReschedule', () => {
  it('is true when hour/minute changed', () => {
    expect(shouldReschedule({ hour: 21, minute: 0 }, { hour: 8, minute: 0 })).toBe(true);
  });
  it('is false when unchanged', () => {
    expect(shouldReschedule({ hour: 21, minute: 0 }, { hour: 21, minute: 0 })).toBe(false);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `bun test packages/features/src/review-reminder/schedule.test.ts`
Expected: FAIL (모듈 없음)

**Step 3: 최소 구현**

```ts
export interface ReminderTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 21, minute: 0 };

/** 다음 발화 시각: 오늘 hour:minute이 지났으면 내일 같은 시각. */
export function computeNextFireAt(now: number, hour: number, minute: number): number {
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.getTime();
}

export function shouldReschedule(current: ReminderTime, next: ReminderTime): boolean {
  return current.hour !== next.hour || current.minute !== next.minute;
}
```

**Step 4: 테스트 통과 확인**

Run: `bun test packages/features/src/review-reminder/schedule.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/features/src/review-reminder/
git commit -m "feat(features): 복습 리마인더 발화 시각 계산 순수 로직"
```

---

### Task A2: 공유 코어 — 메시지 빌더와 스케줄러 포트

**Files:**
- Create: `packages/features/src/review-reminder/message.ts`
- Create: `packages/features/src/review-reminder/message.test.ts`
- Create: `packages/features/src/review-reminder/types.ts`
- Create: `packages/features/src/review-reminder/index.ts`

**Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from 'bun:test';
import { buildReminderMessage } from './message';

describe('buildReminderMessage', () => {
  it('ko: 1개일 때도 자연스럽다', () => {
    expect(buildReminderMessage('ko', 1)).toBe('복습할 항목 1개가 기다리고 있어요');
  });
  it('ko: N개', () => {
    expect(buildReminderMessage('ko', 12)).toBe('복습할 항목 12개가 기다리고 있어요');
  });
  it('en', () => {
    expect(buildReminderMessage('en', 3)).toBe('3 items are waiting for review');
  });
  it('0개는 알림을 보내지 않는다 (null)', () => {
    expect(buildReminderMessage('ko', 0)).toBeNull();
  });
});
```

**Step 2: 실패 확인** — `bun test packages/features/src/review-reminder/message.test.ts` → FAIL

**Step 3: 구현**

`message.ts`:

```ts
export type ReminderLocale = 'ko' | 'en';

/** 0개면 null — 호출부는 알림을 발화하지 않는다. */
export function buildReminderMessage(locale: ReminderLocale, dueCount: number): string | null {
  if (dueCount <= 0) return null;
  if (locale === 'ko') return `복습할 항목 ${dueCount}개가 기다리고 있어요`;
  return `${dueCount} item${dueCount === 1 ? ' is' : 's are'} waiting for review`;
}
```

`types.ts` (플랫폼 어댑터가 구현할 포트):

```ts
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
```

`index.ts`:

```ts
export { computeNextFireAt, shouldReschedule, DEFAULT_REMINDER_TIME, type ReminderTime } from './schedule';
export { buildReminderMessage, type ReminderLocale } from './message';
export type { ReviewReminderScheduler, ReviewReminderControllerDeps } from './types';
export { createReviewReminderController } from './createReviewReminderController';
```

(컨트롤러는 Task A3에서 만들므로 이 시점 index.ts에서 createReviewReminderController 줄은 A3 이후 추가하거나, 처음부터 넣되 A3 전까지 테스트는 schedule/message만 돌린다.)

**Step 4: 통과 확인** — `bun test packages/features/src/review-reminder/` → PASS

**Step 5: Commit**

```bash
git add packages/features/src/review-reminder/
git commit -m "feat(features): 복습 리마인더 메시지 빌더·스케줄러 포트"
```

---

### Task A3: 공유 코어 — 리마인더 컨트롤러

**Files:**
- Create: `packages/features/src/review-reminder/createReviewReminderController.ts`
- Create: `packages/features/src/review-reminder/createReviewReminderController.test.ts`
- Modify: `packages/features/src/review-reminder/index.ts`

**Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from 'bun:test';
import { createReviewReminderController } from './createReviewReminderController';
import type { ReviewReminderScheduler } from './types';

function fakeScheduler() {
  const calls: string[] = [];
  let scheduledBody: string | null = null;
  const scheduler: ReviewReminderScheduler = {
    requestPermission: async () => {
      calls.push('permission');
      return true;
    },
    scheduleDaily: async (_time, body) => {
      calls.push(`schedule:${body}`);
      scheduledBody = body;
    },
    cancel: async () => {
      calls.push('cancel');
      scheduledBody = null;
    },
    getStatus: async () => ({ scheduled: scheduledBody !== null }),
  };
  return { scheduler, calls, get scheduledBody() { return scheduledBody; } };
}

describe('createReviewReminderController', () => {
  it('활성화: 권한 요청 → 현재 due 개수로 하루 1회 예약', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 7,
      locale: () => 'ko',
    });
    const result = await controller.enable({ hour: 21, minute: 0 });
    expect(result).toBe(true);
    expect(fake.calls[0]).toBe('permission');
    expect(fake.scheduledBody).toBe('복습할 항목 7개가 기다리고 있어요');
  });

  it('권한 거부 시 false 반환, 예약하지 않음', async () => {
    const fake = fakeScheduler();
    fake.scheduler.requestPermission = async () => false;
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 7,
    });
    expect(await controller.enable({ hour: 21, minute: 0 })).toBe(false);
    expect(fake.scheduledBody).toBeNull();
  });

  it('due 0개면 권한은 요청하지만 body 없이 예약하지 않는다', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 0,
    });
    expect(await controller.enable({ hour: 21, minute: 0 })).toBe(true);
    expect(fake.scheduledBody).toBeNull();
    expect(fake.calls).toContain('permission');
  });

  it('refresh: 기존 예약을 현재 due 개수로 갱신', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 3,
    });
    await controller.refresh({ hour: 21, minute: 0 });
    await controller.refresh({ hour: 21, minute: 0 });
    expect(fake.calls.filter((c) => c.startsWith('schedule')).length).toBe(2);
  });

  it('disable: 취소 호출', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 3,
    });
    await controller.disable();
    expect(fake.calls).toContain('cancel');
  });
});
```

**Step 2: 실패 확인** — `bun test packages/features/src/review-reminder/createReviewReminderController.test.ts` → FAIL

**Step 3: 구현**

```ts
import { buildReminderMessage, type ReminderLocale } from './message';
import type { ReminderTime, ReviewReminderControllerDeps } from './types';

export interface ReviewReminderController {
  enable(time: ReminderTime): Promise<boolean>;
  /** 복습 mutation 성공·포그라운드 전환 후 현재 due 개수로 갱신. 비활성 상태면 no-op. */
  refresh(time: ReminderTime): Promise<void>;
  disable(): Promise<void>;
}

export function createReviewReminderController(deps: ReviewReminderControllerDeps): ReviewReminderController {
  const { scheduler, getDueCount } = deps;
  const getLocale = deps.locale ?? ((): ReminderLocale => 'ko');
  let enabled = false;
  let time: ReminderTime = { ...{ hour: 21, minute: 0 } };

  return {
    async enable(next) {
      time = next;
      const granted = await scheduler.requestPermission();
      if (!granted) return false;
      enabled = true;
      await this.refresh(time);
      return true;
    },
    async refresh(next) {
      time = next;
      if (!enabled) return;
      const count = await getDueCount();
      if (count <= 0) {
        // due가 없으면 알림을 보내지 않도록 취소만 해둔다 (예약 슬롯 절약)
        await scheduler.cancel();
        return;
      }
      const body = buildReminderMessage(getLocale(), count);
      if (body) await scheduler.scheduleDaily(time, body);
    },
    async disable() {
      enabled = false;
      await scheduler.cancel();
    },
  };
}
```

(주의: `this.refresh` 대신 객체 리터럴을 변수로 추출해 참조하거나, enable 내부 로직을 refresh와 공유하도록 구현할 것 — `this` 의존을 피하는 방식으로 작성.)

**Step 4: 통과 확인** — `bun test packages/features/src/review-reminder/` → PASS

**Step 5:** `index.ts`에 컨트롤러 익스포트 추가(이미 A2에서 넣었다면 생략)하고 Commit:

```bash
git add packages/features/src/review-reminder/
git commit -m "feat(features): 복습 리마인더 컨트롤러 (enable/refresh/disable)"
```

---

### Task A4: 공유 훅 — useReviewReminderScheduler

**Files:**
- Create: `packages/hooks/src/queries/useReviewReminder.ts`
- Modify: `packages/hooks/src/index.ts` (익스포트 추가)

**Step 1: 훅 구현** (UI 로직이므로 유닛 테스트 없음 — 코어가 이미 테스트됨)

```ts
import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCoreClient, queryKeys } from './core-client-context';
// 주의: core-client-context에서 queryKeys가 익스포트되는지 확인. 없다면 '../query-keys'에서 import.
import {
  createReviewReminderController,
  DEFAULT_REMINDER_TIME,
  type ReviewReminderController,
  type ReviewReminderScheduler,
  type ReminderTime,
} from '@glimpse/features';

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
  const coreClient = useCoreClient();
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
    });
    controllerRef.current = controller;
    if (enabledRef.current) {
      void controller.enable(timeRef.current).catch(() => undefined);
    }
    return () => {
      controllerRef.current = null;
    };
    // scheduler/coreClient 변경시에만 재생성
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduler, coreClient]);

  /** due 데이터가 바뀔 때마다 다음 발화 본문 갱신 */
  const dueItems = queryClient.getQueryData<unknown[]>([...queryKeys.review.dueItems]);
  useEffect(() => {
    if (!options.enabled) return;
    controllerRef.current?.refresh(timeRef.current).catch(() => undefined);
    // dueItems 참조 변화에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueItems, options.enabled]);

  const setEnabled = useCallback(async (next: boolean, time: ReminderTime) => {
    const controller = controllerRef.current;
    if (!controller) return false;
    if (next) return controller.enable(time);
    await controller.disable();
    return true;
  }, []);

  return { setEnabled, defaultTime: DEFAULT_REMINDER_TIME };
}
```

(구현 시 `queryKeys` import 위치는 실제 파일 구조에 맞춰 조정할 것.)

**Step 2: `packages/hooks/src/index.ts`에 익스포트 추가**

```ts
export { useReviewReminderScheduler } from './queries/useReviewReminder';
```

**Step 3: typecheck**

Run: `cd apps/mobile && npx tsc --noEmit` (훅을 소비하는 앱에서 확인)
Expected: 기존 오류 없음 (새 코드 오류 없음)

**Step 4: Commit**

```bash
git add packages/hooks/src/queries/useReviewReminder.ts packages/hooks/src/index.ts
git commit -m "feat(hooks): 복습 리마인더 공유 훅 (스케줄러 어댑터 주입)"
```

---

### Task A5: 모바일 어댑터 — expo-notifications

**Files:**
- Create: `apps/mobile/src/features/notifications/expoReviewReminderScheduler.ts`
- Create: `apps/mobile/src/features/notifications/index.ts`
- Modify: `apps/mobile/package.json` (의존성 추가)

**Step 1: 의존성 설치**

Run: `cd apps/mobile && bun add expo-notifications`
Expected: package.json에 추가됨 (Expo SDK 57 호환 버전)

**Step 2: 어댑터 구현** (네이티브 모듈이라 유닛 테스트 없음 — 플랫폼 가드와 로그만)

```ts
import * as Notifications from 'expo-notifications';
import type { ReviewReminderScheduler } from '@glimpse/features';

const ANDROID_CHANNEL_ID = 'review-reminder';
let scheduledIdentifier: string | null = null;

/** 웹/미지원 환경 가드. */
export function isNotificationSupported(): boolean {
  return 'Notification' in globalThis || Notifications !== undefined;
}

export const expoReviewReminderScheduler: ReviewReminderScheduler = {
  async requestPermission() {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (!settings.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  },
  async scheduleDaily(time, body) {
    await ensureAndroidChannel();
    if (scheduledIdentifier) {
      await Notifications.cancelScheduledNotificationAsync(scheduledIdentifier).catch(() => undefined);
      scheduledIdentifier = null;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Glimpse', body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    scheduledIdentifier = id;
  },
  async cancel() {
    if (scheduledIdentifier) {
      await Notifications.cancelScheduledNotificationAsync(scheduledIdentifier).catch(() => undefined);
      scheduledIdentifier = null;
    }
  },
  async getStatus() {
    if (!scheduledIdentifier) return { scheduled: false };
    return { scheduled: true };
  },
};

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '복습 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => undefined);
}
```

(구현 시 `Platform` import 추가 필요. `app.json`에 `expo-notifications` 플러그인은 SDK 57에서 자동 포함 — 별도 plugins 항목 불필요하면 추가하지 않는다.)

**Step 3: `index.ts`**

```ts
export { expoReviewReminderScheduler, isNotificationSupported } from './expoReviewReminderScheduler';
```

**Step 4: typecheck** — `cd apps/mobile && npx tsc --noEmit` → PASS

**Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/src/features/notifications/ bun.lock
git commit -m "feat(mobile): expo-notifications 복습 리마인더 어댑터"
```

---

### Task A6: 모바일 설정 — 스토어 + 섹션 UI

**Files:**
- Create: `apps/mobile/src/stores/settings/review-reminder.store.ts`
- Create: `apps/mobile/src/components/settings/ReviewReminderSection.tsx`
- Modify: `apps/mobile/src/lib/storage.shared.ts` (StorageKeys 추가)
- Modify: `apps/mobile/src/localization/catalog.ts` (ko/en 메시지 추가)
- Modify: `apps/mobile/app/settings.tsx` (섹션 마운트)

**Step 1: StorageKeys에 추가**

```ts
// Review reminder settings
REVIEW_REMINDER_ENABLED: 'review_reminder_enabled',
REVIEW_REMINDER_HOUR: 'review_reminder_hour',
REVIEW_REMINDER_MINUTE: 'review_reminder_minute',
```

**Step 2: 스토어 구현** (appleIntelligence.store.ts의 vanilla store 패턴 + KeyValueStorage 저장)

상태: `{ enabled: boolean; hour: number; minute: number }`, 액션: `hydrate()`, `setEnabled(enabled)`, `setTime(hour, minute)`. 변경 시 `KeyValueStorage`에 기록. 기본값 `{ enabled: false, hour: 21, minute: 0 }`.

**Step 3: 로캘 카탈로그에 키 추가** (ko/en 모두)

```
settings.reviewReminderTitle: '복습 알림' / 'Review reminders'
settings.reviewReminderFooter: '매일 지정한 시간에 복습할 항목 수를 알려드립니다' / 'Daily digest of items due for review at your chosen time'
settings.reviewReminderEnable: '매일 알려드리기' / 'Notify me daily'
settings.reviewReminderTime: '알림 시간' / 'Reminder time'
settings.reviewReminderDenied: '알림 권한이 꺼져 있어요. 시스템 설정에서 허용해 주세요' / 'Notifications are blocked. Enable them in system settings'
```

**Step 4: ReviewReminderSection 구현** — `SettingsSection` + 스위치(기존 섹션의 토글 패턴 재사용) + 시간 선택(Pressable로 hour/minute 스테퍼 또는 기존 선택 UI 패턴). `useReviewReminderScheduler(expoReviewReminderScheduler, { enabled, time, locale })`를 연결해 enable/disable 처리. 권한 거부(false 반환) 시 `setEnabled(false)` 복구 + `messages.settings.reviewReminderDenied` 표시. 스위치 컴포넌트는 기존 섹션(예: LocalLLMSection/SemanticSearchSection)의 것과 동일 패턴 사용.

**Step 5: settings.tsx에 마운트** — Review 탭 관련 항목 근처에 `<ReviewReminderSection />` 추가.

**Step 6: 검증**

Run: `cd apps/mobile && npx tsc --noEmit && bun run lint`
Expected: PASS

**Step 7: Commit**

```bash
git add apps/mobile/src/stores/settings/review-reminder.store.ts apps/mobile/src/components/settings/ReviewReminderSection.tsx apps/mobile/src/lib/storage.shared.ts apps/mobile/src/localization/catalog.ts apps/mobile/app/settings.tsx
git commit -m "feat(mobile): 복습 알림 설정 섹션 (토글·시간·권한 처리)"
```

---

### Task A7: 모바일 리마인더 갱신 연결

**Files:**
- Modify: `apps/mobile/app/_layout.tsx` (훅 마운트: 포그라운드 전환 시 due 쿼리가 자연 갱신되므로, 복습 mutation 성공 시 무효화만으로 Task A4 훅이 반응)

**Step 1:** `_layout.tsx`에 `useReviewReminderScheduler(expoReviewReminderScheduler, {...스토어에서 읽은 값})` 마운트. 스토어 hydrate는 앱 시작 시 1회.

(복습 mutation이 `queryKeys.review.dueItems`를 무효화하는 것은 기존 동작이므로, Task A4 훅의 dueItems 의존 effect가 자동으로 refresh를 호출한다 — 추가 배선 불필요.)

**Step 2: 검증** — typecheck + lint PASS

**Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): 앱 셸에 복습 리마인더 훅 마운트"
```

---

### Task A8: 데스크톱 어댑터 — Tauri notification

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml` (`tauri-plugin-notification = "2"` 추가)
- Modify: `apps/desktop/src-tauri/src/main.rs` (`.plugin(tauri_plugin_notification::init())` 추가)
- Modify: `apps/desktop/package.json` (`@tauri-apps/plugin-notification` 추가)
- Create: `apps/desktop/src/features/notifications/tauriReviewReminderScheduler.ts`
- Create: `apps/desktop/src/features/notifications/index.ts`

**Step 1: 의존성 추가**

Run: `cd apps/desktop && bun add @tauri-apps/plugin-notification`
Cargo.toml `[dependencies]`에 `tauri-plugin-notification = "2"` 추가 후 `cargo check`로 검증.

**Step 2: main.rs에 플러그인 등록** — updater 플러그인 줄 아래에 `.plugin(tauri_plugin_notification::init())` 추가.

**Step 3: capability 부여** — 이 프로젝트는 capabilities 디렉토리가 없고(Tauri 2 기본 allow-all 로컬 설정), updater 플러그인도 별도 capability 없이 동작 중. 만약 빌드 시 `notification:default` 권한 오류가 나면 `apps/desktop/src-tauri/capabilities/default.json` 신설:

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": ["core:default", "notification:default"]
}
```

**Step 4: 어댑터 구현** (데스크톱은 상시 실행이므로 "scheduleDaily"는 즉시 알림 발사로 근사 — 발화 시각 도달 시 훅이 알림을 띄우는 방식 대신, 컨트롤러와 동일 인터페이스를 유지하기 위해 어댑터 내부에서 setTimeout으로 다음 발화 시각까지 대기 후 `isPermissionGranted → sendNotification` 실행. 앱 종료 시 타이머 소멸은 허용 — 상시 실행 앱 기준)

```ts
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { computeNextFireAt, type ReviewReminderScheduler } from '@glimpse/features';

let timerId: ReturnType<typeof setTimeout> | null = null;

export const tauriReviewReminderScheduler: ReviewReminderScheduler = {
  async requestPermission() {
    const granted = await isPermissionGranted();
    if (granted) return true;
    return (await requestPermission()) === 'granted';
  },
  async scheduleDaily(time, body) {
    if (timerId) clearTimeout(timerId);
    const delay = computeNextFireAt(Date.now(), time.hour, time.minute) - Date.now();
    timerId = setTimeout(() => {
      void (async () => {
        if (await isPermissionGranted()) {
          await sendNotification({ title: 'Glimpse', body });
        }
      })();
    }, delay);
  },
  async cancel() {
    if (timerId) clearTimeout(timerId);
    timerId = null;
  },
  async getStatus() {
    return { scheduled: timerId !== null };
  },
};
```

**Step 5: 검증** — `cd apps/desktop && npx tsc --noEmit && cargo check` PASS

**Step 6: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/src/main.rs apps/desktop/package.json apps/desktop/src/features/notifications/ apps/desktop/src-tauri/capabilities/ bun.lock
git commit -m "feat(desktop): Tauri notification 복습 리마인더 어댑터"
```

---

### Task A9: 데스크톱 설정 UI + 마운트

**Files:**
- Create: `apps/desktop/src/components/settings/ReviewReminderSection.tsx` (기존 데스크톱 설정 섹션 컴포넌트 패턴 확인 후 작성)
- Modify: `apps/desktop/src/app/_authenticated/settings.tsx` (섹션 마운트)
- Modify: `apps/desktop/src/App.tsx` 또는 앱 셸 (훅 마운트 — 실제 셸 파일은 구현 시 확인)

**Step 1:** 기존 데스크톱 설정 화면의 섹션 컴포넌트 패턴(예: `apps/desktop/src/components/settings/` 디렉토리)을 확인하고 동일 스타일로 작성. 스토어는 모바일과 달리 데스크톱에 settings store가 없으므로 `@glimpse/hooks`의 `useReviewReminderScheduler(tauriReviewReminderScheduler, ...)`에 로컬 `useState` + `localStorage` persist(`key: 'review_reminder_settings'`)를 사용. (모바일 MMKV 계약과 달리 데스크톱은 브라우저 스토리지가 이미 사용 중인지 확인 후 동일 방식 채택.)

**Step 2:** 설정 화면에 섹션 마운트, 앱 셸에 훅 마운트.

**Step 3: 검증** — `cd apps/desktop && npx tsc --noEmit` PASS

**Step 4: Commit**

```bash
git add apps/desktop/src/components/settings/ apps/desktop/src/app/_authenticated/settings.tsx apps/desktop/src/App.tsx
git commit -m "feat(desktop): 복습 알림 설정 섹션·훅 마운트"
```

---

# 파트 B — 라벨링 백필

### Task B1: 공유 코어 — 백필 로직

**Files:**
- Create: `packages/features/src/labeling/backfill.ts`
- Create: `packages/features/src/labeling/backfill.test.ts`
- Modify: `packages/features/src/index.ts` (익스포트)

**Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from 'bun:test';
import { selectItemsForBackfill } from './backfill';
import type { KnowledgeItem } from '@glimpse/shared';

function item(overrides: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: 'x', type: 'note', title: null, body: 'hello', url: null, summary: null,
    tags: null, labels: null, provisionalLabels: null, labelStatus: null,
    labelSource: null, labelVersion: null, labelScore: null, labelRequestedAt: null,
    labelCompletedAt: null, labelError: null, createdAt: 0, updatedAt: 0,
    stability: null, difficulty: null, lastReviewedAt: null, nextReviewAt: null,
    ...overrides,
  };
}

describe('selectItemsForBackfill', () => {
  it('labelStatus가 null이고 본문이 있는 항목만 선별', () => {
    const items = [
      item({ id: 'a' }),
      item({ id: 'b', labelStatus: 'pending' }),
      item({ id: 'c', labelStatus: 'provisional' }),
      item({ id: 'd', body: null }),
      item({ id: 'e', body: '   ' }),
    ];
    expect(selectItemsForBackfill(items).map((i) => i.id)).toEqual(['a']);
  });
  it('본문이 없어도 title이 있으면 선별', () => {
    expect(selectItemsForBackfill([item({ id: 't', body: null, title: 'T' })]).map((i) => i.id)).toEqual(['t']);
  });
});
```

**Step 2: 실패 확인** — `bun test packages/features/src/labeling/backfill.test.ts` → FAIL

**Step 3: 구현**

```ts
import type { CoreClient, KnowledgeItem } from '@glimpse/shared';

/** 라벨링 파이프라인 활성화 이전 항목(null) 중 처리 가능한 것을 선별한다. */
export function selectItemsForBackfill(items: KnowledgeItem[]): KnowledgeItem[] {
  const hasText = (i: KnowledgeItem) =>
    (i.body != null && i.body.trim().length > 0) ||
    (i.title != null && i.title.trim().length > 0);
  return items.filter((i) => i.labelStatus == null && hasText(i));
}

export interface LabelingBackfillDeps {
  coreClient: Pick<CoreClient, 'listKnowledgeItems' | 'updateKnowledgeItem'>;
  /** 재실행 방지 플래그. 버전이 바뀌면 재백필. */
  getCompletedBackfillVersion: () => number;
  setCompletedBackfillVersion: (version: number) => void;
  now?: () => number;
}

export const LABELING_BACKFILL_VERSION = 1;

/**
 * 활성화 이전 저장분을 기존 라벨링 큐(pending)에 편입시킨다.
 * 마킹이 하나라도 실패하면 플래그를 남기지 않아 다음 시작에 재시도한다.
 */
export async function runLabelingBackfill(deps: LabelingBackfillDeps): Promise<{ markedCount: number }> {
  if (deps.getCompletedBackfillVersion() >= LABELING_BACKFILL_VERSION) {
    return { markedCount: 0 };
  }
  const all = await deps.coreClient.listKnowledgeItems();
  const targets = selectItemsForBackfill(all);
  const now = (deps.now ?? Date.now)();
  let markedCount = 0;
  let failed = false;
  for (const target of targets) {
    try {
      await deps.coreClient.updateKnowledgeItem(target.id, {
        labelStatus: 'pending',
        labelRequestedAt: now,
        updatedAt: now,
      });
      markedCount += 1;
    } catch {
      failed = true; // 개별 실패는 건너뛰고 계속
    }
  }
  if (!failed) {
    deps.setCompletedBackfillVersion(LABELING_BACKFILL_VERSION);
  }
  return { markedCount: markedCount };
}
```

(`updateKnowledgeItem`의 patch 타입이 `Partial<KnowledgeItem>` 형태인지 실제 시그니처 확인 후 맞출 것.)

**Step 4: 통과 확인** — `bun test packages/features/src/labeling/backfill.test.ts` → PASS

**Step 5: 익스포트 추가 + Commit**

```bash
git add packages/features/src/labeling/ packages/features/src/index.ts
git commit -m "feat(features): 라벨링 백필 — 미라벨 항목을 pending 큐에 편입"
```

---

### Task B2: 공유 훅 — useLabelingBackfill

**Files:**
- Create: `packages/hooks/src/queries/useLabelingBackfill.ts`
- Modify: `packages/hooks/src/index.ts`

**Step 1: 훅 구현**

```ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CoreClient } from '@glimpse/shared';
import { LABELING_BACKFILL_VERSION, runLabelingBackfill } from '@glimpse/features';
import { queryKeys } from '../query-keys';

export interface LabelingBackfillStorage {
  getCompletedBackfillVersion(): number;
  setCompletedBackfillVersion(version: number): void;
}

/**
 * 앱 시작 시 1회, 활성화 이전 미라벨 항목을 pending 큐에 편입한다.
 * 실제 라벨링은 기존 포그라운드/백그라운드 큐가 점진 소화한다.
 */
export function useLabelingBackfill(
  coreClient: CoreClient | null | undefined,
  storage: LabelingBackfillStorage,
) {
  const queryClient = useQueryClient();
  const storageRef = useRef(storage);
  storageRef.current = storage;
  const ranRef = useRef(false);

  useEffect(() => {
    if (!coreClient || ranRef.current) return;
    ranRef.current = true;
    void runLabelingBackfill({
      coreClient,
      getCompletedBackfillVersion: () => storageRef.current.getCompletedBackfillVersion(),
      setCompletedBackfillVersion: (v) => storageRef.current.setCompletedBackfillVersion(v),
    }).then((result) => {
      if (result.markedCount > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
      }
    }).catch(() => undefined);
  }, [coreClient, queryClient]);
}
```

**Step 2: 익스포트 추가, typecheck PASS 확인**

**Step 3: Commit**

```bash
git add packages/hooks/src/queries/useLabelingBackfill.ts packages/hooks/src/index.ts
git commit -m "feat(hooks): 라벨링 백필 공유 훅"
```

---

### Task B3: 모바일 연결

**Files:**
- Create: `apps/mobile/src/features/labeling/backfill-storage.ts` (KeyValueStorage 기반 버전 플래그)
- Modify: `apps/mobile/app/_layout.tsx` (훅 마운트)

**Step 1:** `backfill-storage.ts` — `StorageKeys.LABELING_BACKFILL_VERSION: 'labeling_backfill_version'` 추가, `getNumber`/`setNumber`(KeyValueStorage에 setNumber는 set(key, number) 사용)로 구현.

**Step 2:** `_layout.tsx`에서 `useLabelingBackfill(mobileCoreClient, mobileBackfillStorage)` 마운트 (기존 `useAppForegroundLabeling` 근처).

**Step 3: 검증** — typecheck + lint PASS

**Step 4: Commit**

```bash
git add apps/mobile/src/features/labeling/backfill-storage.ts apps/mobile/src/lib/storage.shared.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): 시작 시 라벨링 백필 마운트"
```

---

### Task B4: 데스크톱 연결

**Files:**
- Create: `apps/desktop/src/features/labeling/backfill-storage.ts` (localStorage 기반)
- Modify: `apps/desktop/src/App.tsx` 또는 앱 셸 (Task A9에서 확인한 셸 파일) — `useLabelingBackfill(useCoreClient(), desktopBackfillStorage)` 마운트

**Step 1:** localStorage 구현:

```ts
const KEY = 'labeling_backfill_version';
export const desktopBackfillStorage = {
  getCompletedBackfillVersion: () => Number(localStorage.getItem(KEY) ?? '0'),
  setCompletedBackfillVersion: (v: number) => localStorage.setItem(KEY, String(v)),
};
```

**Step 2:** 셸 컴포넌트에 훅 마운트 (coreClient는 `useCoreClient()` 사용).

**Step 3: 검증** — typecheck PASS

**Step 4: Commit**

```bash
git add apps/desktop/src/features/labeling/ apps/desktop/src/App.tsx
git commit -m "feat(desktop): 시작 시 라벨링 백필 마운트"
```

---

# 파트 C — AI 미설정 경험

### Task C1: 공유 요약 프리뷰 함수

**Files:**
- Create: `packages/features/src/capture/summary-preview.ts`
- Create: `packages/features/src/capture/summary-preview.test.ts`
- Modify: `packages/features/src/index.ts`

**Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from 'bun:test';
import { buildSummaryPreview } from './summary-preview';

describe('buildSummaryPreview', () => {
  it('빈 본문은 빈 문자열', () => {
    expect(buildSummaryPreview('')).toBe('');
    expect(buildSummaryPreview('   ')).toBe('');
  });
  it('첫 완결 문장을 추출한다', () => {
    const first = '첫 번째 문장입니다. 두 번째 문장은 잘립니다.';
    expect(buildSummaryPreview(first)).toBe('첫 번째 문장입니다.');
  });
  it('문장이 140자를 넘으면 경계에서 절단', () => {
    const long = '가'.repeat(200) + '. 뒤 문장';
    const out = buildSummaryPreview(long);
    expect(out.length).toBeLessThanOrEqual(140);
    expect(out.endsWith('...')).toBe(true);
  });
  it('140자 이하 완결 문장이 없으면 첫 줄을 반환', () => {
    expect(buildSummaryPreview('줄바꿈만 있는 첫 줄\n두 번째 줄')).toBe('줄바꿈만 있는 첫 줄');
  });
  it('영문 문장부도 처리', () => {
    expect(buildSummaryPreview('First sentence. Second one.')).toBe('First sentence.');
  });
});
```

**Step 2: 실패 확인** — FAIL

**Step 3: 구현**

```ts
const MAX_PREVIEW_LENGTH = 140;
const SENTENCE_ENDINGS = ['.', '!', '?', '。', '！', '？'];

/** 마크다운 기호를 걷어내고 본문만 남긴다 (최소한만). */
function stripMarkdownNoise(text: string): string {
  return text.replace(/^#+\s+/gm, '').replace(/[*_`>]/g, '').trim();
}

function findSentenceBoundary(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (SENTENCE_ENDINGS.includes(text[i])) return i + 1;
  }
  return -1;
}

/**
 * 스텁(미설정) 상태에서 보여줄 "미리보기" 요약.
 * 첫 완결 문장(없으면 첫 줄), 140자 초과 시 문장/공백 경계에서 절단+말줄임.
 */
export function buildSummaryPreview(content: string): string {
  const text = stripMarkdownNoise(content);
  if (text.length === 0) return '';

  const newlineIdx = text.indexOf('\n');
  const firstLine = newlineIdx >= 0 ? text.slice(0, newlineIdx).trim() : text;

  const boundary = findSentenceBoundary(firstLine);
  if (boundary > 0) {
    const sentence = firstLine.slice(0, boundary).trim();
    if (sentence.length <= MAX_PREVIEW_LENGTH) return sentence;
    return truncate(firstLine);
  }
  if (firstLine.length <= MAX_PREVIEW_LENGTH) return firstLine;
  return truncate(firstLine);
}

function truncate(text: string): string {
  if (text.length <= MAX_PREVIEW_LENGTH) return text;
  const window = text.slice(0, MAX_PREVIEW_LENGTH);
  const lastSpace = window.lastIndexOf(' ');
  const cut = lastSpace > MAX_PREVIEW_LENGTH / 2 ? window.slice(0, lastSpace) : window;
  return `${cut.trimEnd()}...`;
}
```

**Step 4: 통과 확인** — `bun test packages/features/src/capture/summary-preview.test.ts` → PASS

**Step 5: 익스포트 + Commit**

```bash
git add packages/features/src/capture/ packages/features/src/index.ts
git commit -m "feat(features): 스텁 요약을 완결 문장 미리보기로 개선"
```

---

### Task C2: 모바일 스텁 교체

**Files:**
- Modify: `apps/mobile/src/features/capture/stubs.ts` (`generateSummaryStub`이 `buildSummaryPreview`를 위임)
- Modify: `apps/mobile/src/features/capture/stubs.ts` 관련 테스트가 있으면 갱신 (검색: `grep -rn "generateSummaryStub" apps/mobile --include="*.test.ts"`)

**Step 1:** `generateSummaryStub`을 `buildSummaryPreview` 위임으로 교체 (호환 유지 위해 시그니처 동일).

**Step 2:** 기존 테스트 갱신 (첫 100자 기대치 → 완결 문장 기대치).

**Step 3:** `bun test apps/mobile/src/features/capture/` PASS 확인

**Step 4: Commit**

```bash
git add apps/mobile/src/features/capture/
git commit -m "refactor(mobile): 스텁 요약이 공유 미리보기 빌더를 사용하도록 교체"
```

---

### Task C3: 스텁 타겟 저장 시 토스트 1회 (모바일)

**Files:**
- Create: `apps/mobile/src/features/ai/stub-notice.ts` + `.test.ts` (세션 캡 로직 순수 함수)
- Modify: `apps/mobile/src/hooks/mutations/useCaptureActions.ts` (저장 성공 시 조건 토스트)

**Step 1: 순수 로직 테스트 → 구현**

```ts
// stub-notice.ts
let shownThisSession = false;

/** 세션당 최대 1회 스텁 품질 안내를 표시해야 하는가? */
export function shouldShowStubNoticeOnce(): boolean {
  if (shownThisSession) return false;
  shownThisSession = true;
  return true;
}

/** 테스트용 리셋 */
export function resetStubNoticeForTests(): void {
  shownThisSession = false;
}
```

**Step 2:** `useCaptureActions.ts`의 저장 성공 콜백에서, 현재 labeling/metadata 유효 타겟의 kind가 'stub'이면 `shouldShowStubNoticeOnce()`가 true일 때 `toast.info('지금은 미리보기 품질로 저장돼요 — 설정에서 더 나은 AI를 연결할 수 있어요')`. 타겟 kind 확인은 `apps/mobile/src/features/ai/targets/registry.ts`의 `resolveEffectiveTarget('metadata')` 사용.

**Step 3:** `bun test apps/mobile/src/features/ai/` PASS

**Step 4: Commit**

```bash
git add apps/mobile/src/features/ai/ apps/mobile/src/hooks/mutations/useCaptureActions.ts
git commit -m "feat(mobile): 스텁 타겟 저장 시 세션당 1회 AI 연결 안내 토스트"
```

---

### Task C4: 데스크톱 스텁 교체 + 안내

**Files:**
- Modify: `apps/desktop/src/features/ai/providers/stub-provider.ts` (요약 생성이 `buildSummaryPreview` 사용 — 실제 위치/시그니처는 구현 시 확인)
- Modify: `apps/desktop/src/components/capture/CaptureModal.tsx` (저장 성공 토스트에 동일 1회 안내 — 데스크톱 router가 stub으로 폴백한 경우)

**Step 1:** 데스크톱 stub-provider의 요약 함수를 공유 `buildSummaryPreview`로 교체.

**Step 2:** CaptureModal의 기존 로컬 toast state에 세션 캡 로직 추가 (desktop도 `@glimpse/features`에서 캡 로직 재사용 가능하도록 Task C3의 순수 로직을 공유 패키지로 이동하는 것이 더 DRY — 구현 시 `packages/features/src/capture/stub-notice.ts`로 두고 모바일/데스크톱 모두 소비).

**Step 3:** `cd apps/desktop && npx tsc --noEmit` PASS

**Step 4: Commit**

```bash
git add apps/desktop/src/features/ai/providers/ apps/desktop/src/components/capture/CaptureModal.tsx packages/features/src/capture/
git commit -m "feat(desktop): 스텁 요약 품질 교체·저장 시 1회 안내"
```

---

# 마무리 게이트

### Task D1: 전체 검증

**Step 1:** `bun test` — 전체 PASS 확인
**Step 2:** `bun run lint` — PASS
**Step 3:** `cd apps/mobile && npx tsc --noEmit` PASS / `cd apps/desktop && npx tsc --noEmit` PASS
**Step 4:** `cd apps/desktop && cargo check` PASS
**Step 5:** 스모크: `bun run web` (또는 데스크톱 dev) 기동 확인 후 종료
**Step 6:** 실기기 수동 확인 항목을 `docs/plans/2026-08-28-core-loop-completion-design.md`에 기록 (실제 발화, 권한 프롬프트)

**Step 7: 최종 커밋 (있다면)**

```bash
git add -A
git commit -m "chore: 핵심 루프 완성 파트 마무리 검증"
```

---

## 수동 검증 잔여 (기록용)

- iOS/Android 실기기: 알림 권한 프롬프트, 21:00 실제 발화, 설정 변경 반영
- 데스크톱: OS 알림 권한, 발화 시각 도달 시 알림 표시
- 백필: 라벨링 활성화 이전 데이터가 있는 DB에서 시작 시 pending 전환 → 라벨링 큐 소화 확인
