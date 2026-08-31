import { expect, test } from '@playwright/test';
import { tauriStubInitScript } from './smoke-stubs';

/**
 * Phase C 그래프 GUI 검증 (Tauri IPC 스텁 위 프로덕션 번들).
 *
 * 검증 범위 — 검색→포커스 진입, 상세→포커스 진입, 발견 카드 피드백,
 * 포커스 레이아웃 전환. 스텁 데이터는 smoke-stubs 기본값(빈 목록)과 달리
 * 이 파일 안에서 fixture 3개 + pending 연결 2개를 주입한다.
 */

const ITEMS = [
  {
    id: 'gui-a',
    type: 'note',
    title: '지식 항목 에이',
    body: '포커스 검증용 첫 항목',
    tags: ['테스트'],
    createdAt: 1756600000000,
    updatedAt: 1756600000000,
  },
  {
    id: 'gui-b',
    type: 'note',
    title: '지식 항목 비',
    body: '포커스 검증용 두 번째 항목',
    tags: ['테스트'],
    createdAt: 1756600001000,
    updatedAt: 1756600001000,
  },
  {
    id: 'gui-c',
    type: 'note',
    title: '고립된 항목 씨',
    body: '연결이 없는 세 번째 항목',
    tags: [],
    createdAt: 1756600002000,
    updatedAt: 1756600002000,
  },
];

const RECOMMENDATIONS = [
  {
    id: 'rec-1',
    itemA_id: 'gui-a',
    itemB_id: 'gui-b',
    reason: '두 항목이 같은 테스트 태그를 공유합니다',
    status: 'pending',
    createdAt: 1756600010000,
    respondedAt: null,
  },
  {
    id: 'rec-2',
    itemA_id: 'gui-b',
    itemB_id: 'gui-c',
    reason: '비와 씨의 공통 맥락',
    status: 'pending',
    createdAt: 1756600011000,
    respondedAt: null,
  },
];

/** 스텁에 fixture를 주입한 init script. */
const fixtureInitScript = `
  ${tauriStubInitScript}
  (() => {
    const items = ${JSON.stringify(ITEMS)};
    const recs = ${JSON.stringify(RECOMMENDATIONS)};
    const respondCalls = [];
    window.__glimpseRespondCalls = respondCalls;
    const prevInvoke = window.__TAURI_INTERNALS__.invoke;
    window.__TAURI_INTERNALS__.invoke = async (cmd, args) => {
      if (cmd === 'rustra_dispatch') {
        if (args && args.command === 'listKnowledgeItems') return { items: structuredClone(items) };
        if (args && args.command === 'getKnowledgeItemById') {
          return { item: items.find((i) => i.id === args.args.itemId) ?? null };
        }
        if (args && args.command === 'listRecommendations') return { recommendations: structuredClone(recs) };
        if (args && args.command === 'respondToRecommendation') {
          // tauri 엔진은 { command, args: input } 래핑으로 전달하므로
          // input 자체(args.args)를 기록해 recommendationId를 검증한다.
          respondCalls.push({ ...(args.args ?? {}) });
          return {};
        }
      }
      return prevInvoke(cmd, args);
    };
  })();
`;

test.describe('Phase C 그래프 GUI', () => {
  test('검색→포커스 진입과 피드백 반영', async ({ page }) => {
    await page.addInitScript(fixtureInitScript);
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });

    // 1. 라이브러리 진입 — fixture 3개 렌더 확인
    await page.goto('/library');
    await expect(page.getByText('지식 항목 에이')).toBeVisible();

    // 2. 검색어 입력 → 검색 결과 헤더의 "그래프로 보기" 액션 → /graph?focus=…
    //    (사이드바 "지식 그래프" 내비게이션은 focus 없이 이동하므로 제외)
    await page.getByPlaceholder('지식 검색... (키워드 또는 의미 검색)').fill('지식');
    await page.getByRole('button', { name: '그래프로 보기' }).click();
    await expect(page).toHaveURL(/\/graph\?focus=/);

    // 3. 발견 카드 — pending 근거와 피드백 액션 노출
    //    (focus 진입이 이미 '에이'를 선택 중이라 SVG <title>이 먼저 매칭될 수
    //     있으므로, 카드 문단의 근거는 접근성 스냅샷에서 확인 가능한 카드 UI
    //     요소들로 검증한다)
    await expect(page.getByText('오늘의 발견')).toBeVisible();
    await expect(page.getByRole('button', { name: '연결 수락' })).toBeVisible();
    await expect(page.getByRole('button', { name: '연결 무시' })).toBeVisible();
    await expect(page.getByRole('button', { name: '연결 나중에 보기' })).toBeVisible();

    // 4. 수락 → respondToRecommendation 스텁 호출 기록 확인.
    //    fixture의 두 pending 중 rec-2가 더 최신이므로 발견 규칙상 rec-2가
    //    카드에 노출된다(근거 품질 동률 → 최신성 우선).
    await page.getByRole('button', { name: '연결 수락' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__glimpseRespondCalls.length))
      .toBe(1);
    const call = (await page.evaluate(() => (window as any).__glimpseRespondCalls))[0];
    expect(call.recommendationId).toBe('rec-2');
    expect(call.status).toBe('accepted');

    await page.screenshot({ path: '/tmp/gui-graph-focus.png', fullPage: false });
    expect(consoleErrors.filter((e) => !/smoke stub rejects|Failed to load resource/.test(e))).toEqual([]);
  });

  test('상세→그래프 CTA와 엣지 클릭 근거', async ({ page }) => {
    await page.addInitScript(fixtureInitScript);
    await page.goto('/library/gui-a');
    await expect(page.getByText('지식 항목 에이').first()).toBeVisible();

    // 상세 헤더의 그래프 CTA → /graph?focus=gui-a
    await page.getByRole('button', { name: '그래프에서 주변 보기' }).click();
    await expect(page).toHaveURL(/\/graph\?focus=gui-a/);

    // 포커스 그래프에서 엣지(히트 영역) 클릭 → 근거 패널
    // SVG 내부 role="button" line은 Playwright 가시성 계산에서 hidden으로
    // 판정될 수 있어(투명 스트로크), force 클릭으로 실제 클릭을 검증한다.
    const edgeHit = page.getByRole('button', { name: /연결 보기/ }).first();
    await edgeHit.waitFor({ state: 'attached' });
    await edgeHit.click({ force: true });
    const inspector = page.getByText(/연결 근거|같은 테스트 태그|공통 맥락/).first();
    await expect(inspector).toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: '/tmp/gui-graph-edge.png', fullPage: false });
  });
});
