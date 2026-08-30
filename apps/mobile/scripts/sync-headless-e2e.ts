/**
 * 헤드리스 양방향 동기화 E2E (GUI 불필요).
 *
 * 실제 모바일 동기화 코드 전체 경로를 구동한다:
 *   pairWithDesktop → syncWithDesktop(전체 스냅샷) → 모바일 변경 →
 *   syncWithDesktop(상행 델타 첨부) → 데스크톱 변경 → 하행 델타 →
 *   서버 장애 → 커서 불변(재전송 보장) → 복구.
 *
 * 데스크톱 역할은 Bun 시뮬레이터 서버가 대행한다. 와이어 계약
 * (upstreamDelta/upstreamAck/422/레거시 무ack)은
 * apps/desktop/src-tauri/tests/sync_headless_e2e.rs가 실제 서버로
 * 이미 검증하므로, 여기선 모바일 쪽 실제 코드의 행동에 집중한다.
 *
 * 실행: bun run sync:e2e (apps/mobile)
 */

// --- 네이티브 모듈 스텁 (src/test/setup.ts와 동일한 패턴) ----------------

import { mock } from 'bun:test';

import { randomUUID as nodeRandomUUID } from 'node:crypto';

// expo-modules-core는 임포트 시점에 __DEV__ 글로벌과 globalThis.expo를 읽는다.
(globalThis as Record<string, unknown>).__DEV__ = false;
(globalThis as Record<string, unknown>).expo ??= {
  EventEmitter: class {
    emit() {}
    removeAllListeners() {}
  },
};

mock.module('react-native-nitro-crypto', () => ({
  randomUUID: nodeRandomUUID,
}));

mock.module('expo-device', () => ({
  get deviceName(): string | null {
    return 'Headless E2E Phone';
  },
  modelName: 'E2EModel',
}));

mock.module('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0', select: (o: Record<string, unknown>) => o.ios },
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  NativeModules: {},
  NativeEventEmitter: class {
    addListener() {
      return { remove: () => {} };
    }
    removeListener() {}
    removeAllListeners() {}
  },
  TurboModuleRegistry: { getEnforcing: () => ({}) },
}));

const secureMap = new Map<string, string>();
mock.module('expo-secure-store', () => ({
  getItemAsync: async (key: string) => secureMap.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    secureMap.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    secureMap.delete(key);
  },
  isAvailableAsync: async () => true,
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));

const mmkv = new Map<string, unknown>();
mock.module('react-native-mmkv', () => ({
  createMMKV: () => ({
    set: (key: string, value: unknown) => {
      mmkv.set(key, value);
    },
    getString: (key: string) => mmkv.get(key) as string | undefined,
    getBoolean: (key: string) => mmkv.get(key) as boolean | undefined,
    getNumber: (key: string) => mmkv.get(key) as number | undefined,
    getBuffer: () => undefined,
    contains: (key: string) => mmkv.has(key),
    remove: (key: string) => {
      mmkv.delete(key);
    },
    getAllKeys: () => Array.from(mmkv.keys()),
    clearAll: () => mmkv.clear(),
    recrypt: () => {},
    trim: () => {},
    addOnValueChangedListener: () => ({ remove: () => {} }),
  }),
}));

// sync-discovery는 네이티브 모듈이 필요 — 이 E2E는 주소 직접 페어링만 쓰므로
// "사용 불가"로 응답해도 무방하다 (rediscover만 비활성화됨).
mock.module('../../../modules/sync-discovery/src', () => ({
  isSyncDiscoveryAvailable: () => false,
  discoveryUnavailableError: 'unavailable in headless e2e',
  discoverSyncDesktops: async () => [],
}));

// sync_plan 6커맨드(normalize/discovery/candidates/record*/isHoldingOff)는
// rustra 브리지 소유 — Bun 헤드리스에는 JSI 표면이 없으므로 Rust 계약을
// 미러링하는 스텁으로 대체한다 (sync-bridge-test-mock과 동일 기본값).
const bridgeMock = await import('../src/features/sync/sync-bridge-test-mock');
await bridgeMock.installSyncBridgeMock();

// --- 데스크톱 시뮬레이터 서버 -------------------------------------------

type Row = { id: string; updatedAt: number; [key: string]: unknown };
type Store = { knowledgeItems: Row[] };

function makeDesktopSimulator(listenPort: number) {
  const store: Store = { knowledgeItems: [] };
  const tokens = new Map<string, string>(); // deviceId → token
  let pairingCode = '428164';
  let maxClock = 0;

  const bump = (clock: number) => {
    maxClock = Math.max(maxClock, clock);
  };

  const { gql, serve } = Bun;

  const server = Bun.serve({
    port: listenPort,
    async fetch(request) {
      const url = new URL(request.url);
      const body = request.method === 'POST' ? await request.json() : null;

      if (url.pathname === '/v1/health') {
        return Response.json({
          protocolVersion: 1,
          deviceId: 'sim-desktop',
          deviceName: 'Glimpse Desktop Sim',
          pairingRequired: tokens.size === 0,
        });
      }

      if (url.pathname === '/v1/pair') {
        const { deviceId, pairingCode: code } = body as Record<string, string>;
        if (code !== pairingCode) {
          return Response.json(
            { code: 'pairing_failed', message: '코드 불일치' },
            { status: 401 },
          );
        }
        const token = crypto.randomUUID().replace(/-/g, '').repeat(4);
        tokens.set(deviceId, token);
        return Response.json({
          protocolVersion: 1,
          desktopDeviceId: 'sim-desktop',
          desktopDeviceName: 'Glimpse Desktop Sim',
          token,
          endpoints: { localPort: listenPort, tailscaleUrl: null },
        });
      }

      if (url.pathname === '/v1/sync') {
        const auth = request.headers.get('Authorization') ?? '';
        const token = auth.replace('Bearer ', '');
        const deviceId = (body as Record<string, unknown>).deviceId as string;
        if (tokens.get(deviceId) !== token) {
          return Response.json(
            { code: 'authorization_failed', message: '토큰 불일치' },
            { status: 401 },
          );
        }

        const req = body as {
          snapshot?: { knowledgeItems?: Row[] };
          upstreamDelta?: { knowledgeItems?: Row[] };
          sinceWatermark?: number;
        };

        // 계약: snapshot + upstreamDelta 동시 전송은 거절.
        if (req.snapshot && req.upstreamDelta) {
          return Response.json(
            { code: 'sync_protocol_conflict', message: '동시 전송 불가' },
            { status: 422 },
          );
        }

        // 상행 먼저: LWW 병합 + ack = post-merge 최대 시계.
        let upstreamAck: number | null = null;
        if (req.upstreamDelta) {
          let written = 0;
          for (const row of req.upstreamDelta.knowledgeItems ?? []) {
            const existing = store.knowledgeItems.find((r) => r.id === row.id);
            if (!existing || existing.updatedAt < row.updatedAt) {
              store.knowledgeItems = store.knowledgeItems.filter((r) => r.id !== row.id);
              store.knowledgeItems.push(row);
              written += 1;
            }
            bump(row.updatedAt);
          }
          upstreamAck = maxClock;
          if (written > 0) console.log(`[sim-desktop] upstream merged ${written} rows`);
        }

        bump(Date.now());

        // 전체 스냅샷 경로: 병합 후 스냅샷 + 워터마크 발급.
        if (req.snapshot) {
          for (const row of req.snapshot.knowledgeItems ?? []) {
            bump(row.updatedAt);
          }
          return Response.json({
            protocolVersion: 1,
            snapshot: {
              formatVersion: 2,
              exportedAt: Date.now(),
              knowledgeItems: structuredClone(store.knowledgeItems),
              conversations: [],
              messages: [],
              recommendations: [],
              feedbackEvents: [],
              tombstones: [],
            },
            delta: null,
            newWatermark: maxClock,
            upstreamAck,
            fingerprint: `fp-${store.knowledgeItems.length}-${maxClock}`,
            endpoints: { localPort: listenPort, tailscaleUrl: null },
          });
        }

        // 하행 델타: 워터마크(가드밴드 24h 생략 — 시뮬레이터는 단순화)보다
        // 새 행만 반환.
        const since = req.sinceWatermark ?? 0;
        const deltaRows = store.knowledgeItems.filter((r) => r.updatedAt > since);
        return Response.json({
          protocolVersion: 1,
          snapshot: null,
          delta: {
            formatVersion: 2,
            exportedAt: Date.now(),
            knowledgeItems: structuredClone(deltaRows),
            conversations: [],
            messages: [],
            recommendations: [],
            feedbackEvents: [],
            tombstones: [],
          },
          newWatermark: Math.max(maxClock, since),
          upstreamAck,
          fingerprint: null,
          endpoints: { localPort: listenPort, tailscaleUrl: null },
        });
      }

      return Response.json({ code: 'not_found' }, { status: 404 });
    },
  });
  void gql;

  return {
    port: server.port,
    url: `http://localhost:${server.port}`,
    stop: () => server.stop(true),
    /** 테스트 주입: 데스크톱 쪽 행 추가 */
    addDesktopRow(id: string, updatedAt: number) {
      store.knowledgeItems.push({ id, updatedAt });
      bump(updatedAt);
    },
    store,
    /** 장애 시뮬레이션: Bun.serve 중단/재개 */
    setDown(down: boolean) {
      if (down) server.unref?.();
      void down;
    },
  };
}

// --- 실제 모바일 코드 임포트 (스텁이 먼저 설치된 뒤) ---------------------

async function main() {
  const SIM_PORT = 34_777;
  const desktop = makeDesktopSimulator(SIM_PORT);
  console.log(`[e2e] desktop simulator on ${desktop.url}`);

  const { mobileCoreClient } = await import('../src/features/core');
  const {
    pairWithDesktop,
    syncWithDesktop,
    unpairDesktop,
  } = await import('../src/features/sync/sync-client');
  const { updateSyncConfig, getSyncConfig } = await import('../src/features/sync/sync-store');

  const assert = (condition: unknown, message: string) => {
    if (!condition) {
      console.error(`[e2e] FAIL: ${message}`);
      process.exitCode = 1;
      throw new Error(message);
    }
    console.log(`[e2e] ok: ${message}`);
  };

  // 같은 밀리초에 만들어진 행들의 시계 충돌은 LWW 경계에서 불규칙 실패를
  // 낳는다 — 모든 시나리오 행에 단조 증가 시계를 쓴다.
  let clock = Date.now();
  const tick = () => (clock += 1000);

  await mobileCoreClient.initialize(':memory:');

  // 1. 페어링 (주소 직접 입력 경로 — mDNS 불필요)
  await pairWithDesktop(desktop.url, '428164');
  assert(!!secureMap.get('glimpse_secure_sync_pairing_token'), 'pairing stored a token');
  assert(getSyncConfig().desktopDeviceId === 'sim-desktop', 'config records the desktop');

  // 2. 첫 동기화: 전체 스냅샷 경로, 워터마크 채택.
  //    빈 스토어라 업스트림 행이 없음 → 커서는 null(동결)이 맞다.
  await syncWithDesktop({ force: true });
  const cfg1 = getSyncConfig();
  assert(cfg1.outboundWatermark !== null, 'first sync adopts a watermark (incremental next)');
  // 전체 경로 응답의 ack(서버 데이터셋 최고 시계)를 커서로 채택하는 것이
  // 설계 동작이다 (sync-client.ts의 full-path 주석 참조).
  assert(typeof cfg1.lastAckedUpstreamClock === 'number',
    'first sync adopts the server ack as the upstream cursor');

  // 3. 모바일 변경 → 상행 델타 경로
  await mobileCoreClient.saveKnowledgeItem({
    id: 'phone-capture',
    type: 'note',
    title: 'Captured on phone',
    body: null,
    url: null,
    summary: null,
    tags: ['e2e'],
    labels: null,
    provisionalLabels: null,
    labelStatus: null,
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: tick(),
    updatedAt: tick(),
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  });
  const cfgBefore = getSyncConfig();
  await syncWithDesktop({ force: true });
  const cfgAfter = getSyncConfig();
  assert(cfgAfter.lastAckedUpstreamClock! > (cfgBefore.lastAckedUpstreamClock ?? 0),
    'upstream cursor advanced after the capture sync');
  assert(desktop.store.knowledgeItems.some((r) => r.id === 'phone-capture'),
    'mobile capture landed in the desktop store');

  // 4. 하행: 데스크톱 행이 모바일로 흘러온다
  desktop.addDesktopRow('desktop-note', tick());
  await syncWithDesktop({ force: true });
  const arrived = await mobileCoreClient.getKnowledgeItemById('desktop-note');
  assert(arrived !== null, 'desktop row arrived on mobile via the delta path');

  // 5. 장애 복구: 서버 다운 → 동기화 실패 → 커서 불변 → 서버 복구 → 재동기화
  const beforeFailure = getSyncConfig();
  await desktop.setDown(true);
  // 시뮬레이터 중단 대신 존재하지 않는 포트로 재시도시키는 방식은 곤란하므로,
  // 실패 재현: fetch를 일시적으로 단절시킨다.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('network down (simulated)');
  }) as typeof fetch;
  let failed = false;
  try {
    await mobileCoreClient.saveKnowledgeItem({
      id: 'offline-capture',
      type: 'note',
      title: 'Made offline',
      body: null, url: null, summary: null, tags: [], labels: null,
      provisionalLabels: null, labelStatus: null, labelSource: null,
      labelVersion: null, labelScore: null, labelRequestedAt: null,
      labelCompletedAt: null, labelError: null,
      createdAt: tick(), updatedAt: tick(),
      stability: null, difficulty: null, lastReviewedAt: null, nextReviewAt: null,
    });
    await syncWithDesktop({ force: true });
  } catch {
    failed = true;
  }
  assert(failed, 'sync fails while the desktop is unreachable');
  const duringFailure = getSyncConfig();
  assert(duringFailure.lastAckedUpstreamClock === beforeFailure.lastAckedUpstreamClock,
    'failure froze the upstream cursor (retransmit guarantee)');
  assert(duringFailure.outboundWatermark === beforeFailure.outboundWatermark,
    'failure froze the watermark');
  globalThis.fetch = realFetch;
  await desktop.setDown(false);

  // 복구 후 재동기화: 오프라인 변경이 흘러간다
  await syncWithDesktop({ force: true });
  assert(desktop.store.knowledgeItems.some((r) => r.id === 'offline-capture'),
    'offline capture reached the desktop after recovery');

  // 6. 변경 감지 트리거 검증: syncDataRevision이 쓰기마다 오른다
  const rev1 = await mobileCoreClient.syncDataRevision?.();
  await mobileCoreClient.saveKnowledgeItem({
    id: 'revision-probe',
    type: 'note', title: 'Revision probe', body: null, url: null, summary: null,
    tags: [], labels: null, provisionalLabels: null, labelStatus: null,
    labelSource: null, labelVersion: null, labelScore: null,
    labelRequestedAt: null, labelCompletedAt: null, labelError: null,
    createdAt: tick(), updatedAt: tick(),
    stability: null, difficulty: null, lastReviewedAt: null, nextReviewAt: null,
  });
  const rev2 = await mobileCoreClient.syncDataRevision?.();
  assert(rev2! > rev1!, 'syncDataRevision rises on local writes (change detection)');

  desktop.stop();
  await unpairDesktop();
  console.log('[e2e] ALL PASSED — headless bidirectional sync E2E');
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error('[e2e] FAILED:', error);
  process.exit(1);
});
