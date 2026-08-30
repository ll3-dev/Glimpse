# AI 라이선스 경화 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 결함(P1) 수리 + MIT 전환·배포 준비(노티스 포함) + 모델 카탈로그 34개 라이선스 전수 검증·플래그.

**Architecture:** 4개 독립 커밋 트랙 — (1) 라이선스 기반(LICENSE/노티스/필드), (2) 모델 카탈로그(licenseKind 플래그·기본 추천 교체·UI 경고), (3) 모바일 AI 결함 수리, (4) 데스크톱 AI 결함 수리. 각 트랙은 테스트 포함 단일 관심사 커밋.

**Tech Stack:** TypeScript (Expo RN / Tauri React), Rust workspace, Bun test, HuggingFace 라이선스 검증.

---

## 사전 검증: 모델 라이선스 전수 확인 (Task 0)

구현에 앞서 HuggingFace 모델 카드로 각 패밀리의 실제 라이선스를 확인한다. 레지스트리 자기표신을 신뢰하지 않는다.

| 패밀리/모델 | 레지스트리 표기 | 예상 실제 라이선스 | licenseKind |
|---|---|---|---|
| LFM2.5 (LiquidAI) ×5 | LFM 1.0 | LFM Open License v1.0 — **커스텀** (상용 조건부) | custom |
| Kanana (카카오) ×2 | Kanana Open License | **커스텀** (매출 임계 조건) | custom |
| EXAONE 4.0 | EXAONE AI Model License 1.1 | **커스텀** (비상용 기본) | custom |
| HyperCLOVA X SEED | HyperCLOVA X SEED License | **커스텀** | custom |
| Gemma 3n | Gemma | **커스텀** (Gemma Terms) | custom |
| Qwen3/3.5, MiniCPM5, G9v3, Nanbeige, SmolLM3, Ministral-3, Granite, SmallThinker | Apache-2.0 | Apache-2.0 | permissive |
| Nomic Embed v1.5/v2 | (필드 없음) | Apache-2.0 | permissive |
| Phi-4 | (필드 없음) | MIT | permissive |
| GLM-4.7 Flash | (필드 없음) | **확인 필요** (Zhipu 커스텀 가능성) | 확인 후 |
| Magistral Small | (필드 없음) | **확인 필요** (Mistral Apache 2.0 계열 가능성) | 확인 후 |
| Devstral Small 2 | (필드 없음) | **확인 필요** (Apache-2.0 가능성) | 확인 후 |

Task 0 실행 방법: Task 2 구현 중 WebFetch로 `https://huggingface.co/<repo>` 카드를 확인하고 위 표를 확정한 뒤 필드를 채운다. GLM/Magistral/Devstral은 확인 결과에 따라 기입.

---

### Task 1: 라이선스 기반 — MIT 전환 + 필드 + 노티스

**Files:**
- Modify: `LICENSE` (전면 교체)
- Modify: `package.json` (license 필드 + `licenses:generate` 스크립트)
- Modify: `apps/mobile/package.json`, `apps/desktop/package.json`
- Modify: `packages/{bridge-rust,core-rust,features,hooks,shared,ui}/package.json`
- Modify: `packages/bridge-rust/Cargo.toml`, `packages/core-rust/Cargo.toml`, `apps/desktop/src-tauri/Cargo.toml` (`[package] license`)
- Create: `scripts/generate-notices.ts`
- Create: `THIRD-PARTY-NOTICES.md`
- Modify: `README.md` (License 섹션)

**Step 1: LICENSE를 MIT로 교체**

```
MIT License

Copyright (c) 2026 ll3-dev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: package.json들에 `"license": "MIT"` 추가** (각 파일 `private`/`name` 근처). Cargo.toml 3개는 `[package]` 섹션에 `license = "MIT"` 추가.

**Step 3: 노티스 생성 스크립트 작성** `scripts/generate-notices.ts`:

```ts
/**
 * THIRD-PARTY-NOTICES.md 생성 — npm + workspace 패키지의 라이선스를 집계한다.
 * 실행: bun run licenses:generate
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');

type Entry = { name: string; version: string; license: string; homepage?: string };

function collectFrom(dir: string, out: Map<string, Entry>) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const pkgDir = join(dir, name);
    if (!statSync(pkgDir).isDirectory()) continue;
    // scoped packages: @scope/name 중첩 디렉터리
    const entries = name.startsWith('@') ? readdirSync(pkgDir) : [null];
    for (const sub of entries.length ? entries : [null]) {
      const realDir = sub ? join(pkgDir, sub) : pkgDir;
      const realName = sub ? `${name}/${sub}` : name;
      const pkgJsonPath = join(realDir, 'package.json');
      if (!existsSync(pkgJsonPath)) continue;
      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        if (out.has(realName)) continue;
        out.set(realName, {
          name: `${pkg.name ?? realName}`,
          version: pkg.version ?? '?',
          license: pkg.license ?? 'UNKNOWN',
          homepage: pkg.homepage,
        });
      } catch { /* 손상된 package.json 무시 */ }
    }
  }
}

const entries = new Map<string, Entry>();
collectFrom(join(ROOT, 'node_modules'), entries);

const licenseGroups = new Map<string, string[]>();
for (const e of [...entries.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  const key = e.license;
  if (!licenseGroups.has(key)) licenseGroups.set(key, []);
  licenseGroups.get(key)!.push(`${e.name}@${e.version}`);
}

const lines: string[] = [
  '# Third-Party Notices',
  '',
  '이 애플리케이션은 다음 서드파티 소프트웨어를 포함하거나 사용합니다.',
  '각 항목의 라이선스 전문은 해당 패키지 저장소를 참고하세요.',
  '',
  `생성: bun run licenses:generate (${new Date().toISOString().slice(0, 10)})`,
  '',
];

for (const [license, pkgs] of [...licenseGroups.entries()].sort()) {
  lines.push(`## ${license} (${pkgs.length})`, '', ...pkgs.map((p) => `- ${p}`), '');
}
lines.push(
  '## AI 모델 라이선스',
  '',
  '온디바이스 모델은 사용자가 런타임에 다운로드하며 앱에 번들되지 않습니다.',
  '라이선스는 인앱 모델 카탈로그에 항목별로 표시됩니다 (packages/shared/src/local-model-registry.ts).',
  '',
);

writeFileSync(join(ROOT, 'THIRD-PARTY-NOTICES.md'), lines.join('\n'));
console.log(`THIRD-PARTY-NOTICES.md 생성 완료 — ${entries.size}개 패키지, ${licenseGroups.size}개 라이선스 그룹`);
```

**Step 4: package.json 스크립트 추가**: `"licenses:generate": "bun run scripts/generate-notices.ts"`.

**Step 5: 스크립트 실행 → THIRD-PARTY-NOTICES.md 생성**

Run: `bun run licenses:generate`
Expected: "~1,400개 패키지, N개 라이선스 그룹" 출력, 파일 생성 확인.

**Step 6: README License 섹션 추가** (기존 섹션 스타일 따라):

```markdown
## License

MIT — see [LICENSE](./LICENSE). Third-party notices: [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
```

**Step 7: 검증 + 커밋**

Run: `bun run lint && bun test packages/shared` (노티스 자체는 런타임 영향 없음)
```bash
git add LICENSE package.json apps/mobile/package.json apps/desktop/package.json packages/*/package.json packages/bridge-rust/Cargo.toml packages/core-rust/Cargo.toml apps/desktop/src-tauri/Cargo.toml scripts/generate-notices.ts THIRD-PARTY-NOTICES.md README.md
git commit -m "chore(license): MIT 전환 + license 필드 + 서드파티 노티스 생성"
```

---

### Task 2: 모델 카탈로그 — licenseKind 플래그 + 기본 추천 교체 + UI 경고

**Files:**
- Modify: `packages/shared/src/local-model-registry.ts` (타입 + 전 엔트리)
- Modify: `apps/mobile/src/components/settings/ModelDownloadCard.tsx:87`
- Test: `packages/shared/src/local-model-registry.test.ts` (신규)

**Step 1: 실패하는 테스트 작성** `packages/shared/src/local-model-registry.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { LOCAL_MODEL_REGISTRY, getPreferredEmbeddingModel, LOCAL_DEFAULT_MODEL_ID } from './local-model-registry';

describe('LOCAL_MODEL_REGISTRY licenseKind', () => {
  it('모든 엔트리에 license와 licenseKind가 있다', () => {
    for (const m of LOCAL_MODEL_REGISTRY) {
      expect(m.license).toBeDefined();
      expect(m.licenseKind).toBeDefined();
    }
  });

  it('custom 라이선스 모델은 허용 목록과 정확히 일치한다', () => {
    const CUSTOM = ['lfm2.5-2.6b-q4','kanana-2-3b-instruct-q4','kanana-2-1.3b-instruct-q8',
      'lfm2.5-350m-q4','lfm2.5-1.2b-instruct-q4','lfm2.5-8b-a1b-q4',
      'exaone-4.0-1.2b-q4','hyperclovax-seed-1.5b-q4','gemma-3n-e2b-it-q4'];
    const actual = LOCAL_MODEL_REGISTRY.filter((m) => m.licenseKind === 'custom').map((m) => m.id);
    expect(actual.sort()).toEqual([...CUSTOM].sort());
    expect(actual.length).toBeGreaterThanOrEqual(9);
  });

  it('기본 추천 모델은 permissive 라이선스다', () => {
    const recommended = LOCAL_MODEL_REGISTRY.find((m) => m.mobileProfile?.recommended);
    expect(recommended?.licenseKind).toBe('permissive');
  });

  it('nomic 임베딩 기본 모델은 permissive다', () => {
    expect(getPreferredEmbeddingModel()?.licenseKind).toBe('permissive');
  });
});
```

(테스트가 참조하는 `LOCAL_DEFAULT_MODEL_ID` 등 export는 기존 파일에 있는 그대로 사용 — 없으면 이 테스트에서 제외.)

**Step 2: 테스트 실행 → 실패 확인**

Run: `bun test packages/shared/src/local-model-registry.test.ts`
Expected: FAIL — licenseKind 필드 없음.

**Step 3: 타입 추가 + 전 엔트리 기입.** `LocalModelDefinition`에:

```ts
  /** 라이선스 성격 — permissive(Apache/MIT 등) 또는 custom(조건부 상용 허용) */
  licenseKind: 'permissive' | 'custom';
```

전 34개 엔트리에 Task 0 표 기준으로 기입. HuggingFace 카드 확인(웹페치)으로 GLM-4.7 Flash / Magistral Small / Devstral Small 2의 실제 라이선스를 먼저 확정하고 `license` 필드도 함께 채운다. 누락 5개 데스크톱 엔트리의 `license` 필드도 채운다 (Phi-4 = MIT, Ministral-3 = Apache-2.0( Mistral Research가 아니라 unsloth Q4의 원 모델 라이선스 확인), 나머지 확인 결과대로).

**Step 4: 기본 추천 교체** — `qwen3.5-2b-q4`의 `mobileProfile`: `recommended: true` 추가, `rank: 1`로, strengths에 `"라이선스 검증 완료 (Apache-2.0)"` 스타일 문구. `lfm2.5-2.6b-q4`: `recommended: true` 제거, caveat에 "커스텀 라이선스(LFM 1.0)라 상용 배포 시 확인이 필요해요" 추가, rank는 그대로 둬도 되지만 정렬상 1 근처 유지.

**Step 5: UI 경고** — `ModelDownloadCard.tsx` license 표기 아래:

```tsx
{model.licenseKind === "custom" && (
  <Text className="text-app-subtle mt-1 text-[11px] leading-4">
    이 모델은 퍼블릭 라이선스가 아닌 커스텀 라이선스예요. 상용 배포 시 라이선스 조건을 확인해 주세요.
  </Text>
)}
```

**Step 6: 테스트 통과 확인**

Run: `bun test packages/shared/src/local-model-registry.test.ts`
Expected: PASS.

**Step 7: 커밋**

```bash
git add packages/shared/src/local-model-registry.ts packages/shared/src/local-model-registry.test.ts apps/mobile/src/components/settings/ModelDownloadCard.tsx
git commit -m "feat(models): licenseKind 플래그 + 기본 추천 Apache-2.0 교체 + 커스텀 라이선스 UI 경고"
```

---

### Task 3: 모바일 AI 결함 수리 (타임아웃·hydration·라벨 버전·모델 핀·언로드 레이스)

**Files:**
- Modify: `apps/mobile/src/features/ai/providers/byok-provider.ts:186-200` (타임아웃 + hydration)
- Modify: `apps/mobile/src/features/ai/targets/executors.ts:124-135,156-201,350` (라벨 버전·모델 핀·타임아웃)
- Modify: `apps/mobile/src/features/ai/metadata/types.ts` (에러코드 이미 존재 — 생산 경로만)
- Modify: `apps/mobile/src/hooks/useReleaseLocalLLMOnPressure.ts` (keep-alive 가드)
- Modify: `apps/mobile/src/features/labeling/background-task.ts` (keep-alive 진입/종료)
- Test: `apps/mobile/src/features/ai/providers/byok-provider.test.ts` (기존 파일 확장)
- Test: `apps/mobile/src/hooks/useReleaseLocalLLMOnPressure.test.ts` (신규)

**Step 1: BYOK 타임아웃 실패 테스트** (기존 byok-provider.test.ts에 추가 — fetch stub이 resolve되지 않는 프라미스를 반환하도록):

```ts
it('타임아웃 시 AI_PROVIDER_TIMEOUT 실패', async () => {
  const provider = createBYOKProvider({
    isReady: () => true,
    getApiKey: () => 'k',
    getProvider: () => 'openai',
    getBaseUrl: () => null,
    getModel: () => null,
    fetch: (() => new Promise(() => {})) as typeof fetch,
  });
  const result = await Effect.runPromiseExit(provider.generate(input));
  expect(Exit.isFailure(result)).toBe(true);
  if (Exit.isFailure(result)) {
    expect(result.cause.error.code).toBe('AI_PROVIDER_TIMEOUT');
  }
});
```

(기존 테스트의 패턴/헬퍼를 그대로 따른다 — `input` 픽스처와 Effect 실행 방식은 파일 내 기존 케이스 참조.)

**Step 2: 테스트 실패 확인** → Run: `bun test apps/mobile/src/features/ai/providers/byok-provider.test.ts`
Expected: FAIL (hang 대신 즉시 실패해야 하므로 timeout 코드 불일치).

**Step 3: 타임아웃 구현.** `byok-provider.ts`의 `callAPIEffect` fetch에 signal 부착:

```ts
const response = yield* _(
  Effect.tryPromise({
    try: () =>
      fetchFn(endpoint, {
        method: 'POST',
        headers: config.buildHeaders(apiKey),
        body: config.buildBody(prompt, model),
        signal: AbortSignal.timeout(30_000),
      }),
    catch: (error) =>
      createBYOKError(
        isTimeoutError(error) ? 'AI_PROVIDER_TIMEOUT' : 'AI_PROVIDER_NETWORK_ERROR',
        isTimeoutError(error) ? 'API request timed out' : 'Network error during API call',
        { provider, cause: error },
      ),
  }),
);
```

파일 상단에:

```ts
const BYOK_TIMEOUT_MS = 30_000;

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}
```

**Step 4: BYOK 메타데이터 hydration 가드.** `resolveRequestContext` 호출 전 `generate`에서:

```ts
await ensureBYOKHydrated();
```

(`createBYOKProvider`는 동기 함수라 import만 추가: `import { ensureBYOKHydrated } from '@/src/stores/settings/byok.store';` — `generate` 내부는 Effect.gen이라 `Effect.tryPromise`로 감싸거나 generate를 async 래퍼로 전환. 기존 테스트 주입 방식을 깨지 않게 `config.hydrate?: () => Promise<void>` 옵셔널 주입으로 기본값 `ensureBYOKHydrated`.)

**Step 5: 라벨 버전 수리** — `executors.ts:124-135`:

```ts
function getLabelVersion(target: AITarget): string {
  switch (target.kind) {
    case 'stub':
      return 'stub-label-v1';
    case 'apple':
      return 'apple-label-v1';
    case 'local':
      return 'local-label-v1';
    case 'rules':
      return RULE_BASED_LABELER_VERSION;
    case 'byok':
      return 'byok-label-v1';
  }
}
```

**Step 6: 타깃 모델 핀 존중** — `resolveLocalChatContext`/`resolveBYOKChatConfig`가 `target`을 받도록 시그니처 변경:

- `executeLocalChatTarget(input, target)`: `const pinnedModel = target.modelId ? listLocalLLMModels().find((m) => m.id === target.modelId) : null;` → `getSelectedLocalModel()` 결과 대신 pinned 모델 우선, 없으면 기존 폴백. (정확한 셀렉터명은 `local-llm.selectors.ts` 확인 후 사용.)
- `resolveBYOKChatConfig(target)`: `target.model`이 있으면 `getModel()` 대신 사용.

**Step 7: 언로드 레이스 수리.** `apps/mobile/src/features/ai/local-llm/background-keepalive.ts` 신설:

```ts
/**
 * 백그라운드 작업이 로컬 LLM을 사용하는 동안 지연 언로드 타이머를 보류한다.
 * 모듈 레벨 카운터 — 백그라운드 JS 컨텍스트와 메인 컨텍스트가 같은 모듈 인스턴스를
 * 공유하는 경우에만 유효하며(WorkManager 새 컨텍스트는 별도 인스턴스), 그 경우에도
 * 언로드가 실행 중 태스크를 끊는 최악의 경우를 막는다.
 */
let keepAliveCount = 0;

export function acquireLocalLLMKeepAlive(): void {
  keepAliveCount += 1;
}

export function releaseLocalLLMKeepAlive(): void {
  keepAliveCount = Math.max(0, keepAliveCount - 1);
}

export function hasLocalLLMKeepAlive(): boolean {
  return keepAliveCount > 0;
}
```

`useReleaseLocalLLMOnPressure.ts`의 `release`:

```ts
const release = (reason: 'background' | 'memory-warning') => {
  if (reason === 'background' && hasLocalLLMKeepAlive()) {
    // 백그라운드 라벨링 등이 모델 사용 중 — 이번 배경 진입에서는 언로드 보류
    schedule(() => release('background'), BACKGROUND_RELEASE_DELAY_MS);
    return;
  }
  void unloadSharedLocalLLM().catch((error) => {
    logger.error('Failed to unload local LLM', error, { reason });
  });
};
```

`background-task.ts`의 defineTask 콜백:

```ts
TaskManager.defineTask(LABELING_BACKGROUND_TASK, async () => {
  acquireLocalLLMKeepAlive();
  try {
    const result = await runForegroundLabeling(DEFAULT_BACKGROUND_LABELING_BATCH_SIZE);
    return result.success ? BackgroundTaskResult.Success : BackgroundTaskResult.Failed;
  } finally {
    releaseLocalLLMKeepAlive();
  }
});
```

**Step 8: 테스트 — useReleaseLocalLLMOnPressure + keepalive**

`apps/mobile/src/features/ai/local-llm/background-keepalive.test.ts` 신설 (acquire/release/has 단순 단언) + 훅 테스트는 기존 훅 테스트 패턴(AppState 모킹) 참조해 "keep-alive 중 언로드 보류 후 재스케줄" 케이스 추가.

**Step 9: 전체 검증 + 커밋**

Run: `bun test apps/mobile/src/features/ai apps/mobile/src/hooks && bun run lint && bun run typecheck`
Expected: 전부 PASS.

```bash
git add -A apps/mobile/src
git commit -m "fix(ai-mobile): BYOK 타임아웃·hydration 가드·라벨 버전·모델 핀·백그라운드 언로드 레이스 수리"
```

---

### Task 4: 데스크톱 AI 결함 수리 (공칭 응답·라벨링 라우터·타임아웃)

**Files:**
- Modify: `apps/desktop/src/features/ai/router.ts:92-138` (빈 응답 → 에러)
- Modify: `apps/desktop/src/features/labeling/run-foreground-labeling.ts` + `index.ts` + `useForegroundLabeling.ts` (provider 경유)
- Modify: `apps/desktop/src/features/ai/providers/byok-provider.ts` (complete/stream 타임아웃)
- Test: `apps/desktop/src/features/ai/router.test.ts` (기존 확장)
- Test: `apps/desktop/src/features/labeling/run-foreground-labeling.test.ts` (기존 확장)

**Step 1: 실패 테스트** — router.test.ts에:

```ts
it('빈 응답 시 가짜 응답 대신 에러를 던진다', async () => {
  // provider.complete이 빈 텍스트를 반환하도록 스텁
  vi.mock(...) // 기존 파일의 모킹 패턴 사용
  await expect(generateChatResponse([{ role: 'user', content: '안녕' }])).rejects.toThrow();
});
```

**Step 2: 실패 확인** → Run: `bun test apps/desktop/src/features/ai/router.test.ts`
Expected: FAIL (현재는 가짜 응답 문자열 반환).

**Step 3: router.ts 수리** (L129-137):

```ts
  const text = response.text.replace(/^Assistant:\s*/i, '').trim();
  if (!text) {
    throw new Error('AI 응답이 비어 있습니다. 설정에서 다른 프로바이더를 선택해 주세요.');
  }
  return text;
```

(`lastUserMsg`/`[No response]` 조립 제거. generateChatStreamResponse의 `'[No response]'` 문자열은 그대로 — UI 표시용 구분값.)

**Step 4: 데스크톱 라벨링 provider 정합.** `run-foreground-labeling.ts`에 라벨러 주입:

```ts
export interface RunForegroundLabelingDeps {
  coreClient: Pick<CoreClient, 'listPendingKnowledgeItemsForLabeling' | 'updateKnowledgeItem'>;
  now?: () => number;
  /** 라벨 생성 함수 — 기본 rules. AI provider 정합은 훅에서 주입 */
  labelItem?: (item: KnowledgeItem) => Promise<LabelingResult-like>;
}
```

구현은 단순 유지(YAGNI): `deriveRuleBasedLabels(item)` 호출부를 `deps.labelItem ? await deps.labelItem(item) : deriveRuleBasedLabels(item)`로. `useForegroundLabeling.ts`는 `getProviderForFeature('labeling')` 경유 라벨링으로 교체하는 대신 — 데스크톱 metadata provider의 태그 출력을 라벨로 정규화하는 코드가 모바일 `executors.ts`에 이미 있으나 데스크톱엔 없다. **범위 축소 결정: 데스크톱 라벨링은 rules-only를 명시적 계약으로 문서화**하고 `run-foreground-labeling.ts` 헤더 주석에 "라우터 aiProvider와 무관하게 rules 라벨러 사용 — 데스크톱 AI 라벨링은 별도 과제"를 남긴다. (무리한 provider 배선은 이번 플랜 범위 초과.)

**Step 5: 데스크톱 BYOK 타임아웃** — `complete()`와 `completeBYOKStream()`의 fetch에 `signal: AbortSignal.timeout(30_000)` 부착 + TimeoutError를 기존 에러 체계로 매핑.

**Step 6: 테스트 통과 + 전체 검증 + 커밋**

Run: `bun run desktop:typecheck && bun run desktop:lint && bun test apps/desktop 2>/dev/null || bun run --cwd apps/desktop test`
Expected: PASS.

```bash
git add apps/desktop/src
git commit -m "fix(ai-desktop): 빈 응답 가짜 답변 제거 + 라벨링 rules-only 계약 명시 + BYOK 타임아웃"
```

---

### Task 5: inference-mode 죽은 코드 제거 + Android 매니페스트 정합

**Files:**
- Delete: `apps/mobile/src/features/settings/inferenceMode.commands.ts`
- Delete: `apps/mobile/src/stores/settings/inference-mode.store.ts`
- Delete: `apps/mobile/src/features/core/application/state/inference-mode.ts` + `.test.ts`
- Modify: `apps/mobile/src/features/core/application/state/index.ts:8` (export 제거)
- Modify: `apps/mobile/src/features/core/local-core-store.ts:11,24,32,39-43` (INFERENCE_MODE 키 제거)
- Modify: `apps/mobile/android/app/src/main/AndroidManifest.xml` (RECEIVE_BOOT_COMPLETED 추가)

**Step 1: 참조 확인 후 삭제**

Run: `grep -rn "inferenceMode.commands\|inference-mode.store\|application/state/inference-mode" apps/mobile/src --include="*.ts*" | grep -v test`
Expected: 위 3개 파일 상호 참조만.

파일 3개 삭제 + `state/index.ts` export 제거 + `local-core-store.ts`의 INFERENCE_MODE 키·필드·동기화 블록 제거.

**Step 2: AndroidManifest.xml 권한 추가** (`<uses-permission android:name="android.permission.INTERNET" />` 근처):

```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

**Step 3: 검증 + 커밋**

Run: `bun run lint && bun run typecheck && bun test`
Expected: 전부 PASS — inference-mode 참조 잔존 없음.

```bash
git add -A apps/mobile
git commit -m "chore(ai-mobile): 죽은 inference-mode 서브시스템 제거 + Android 부팅 권한 매니페스트 정합"
```

---

### Task 6: 최종 검증 게이트

**Step 1:** `bun run lint` — PASS
**Step 2:** `bun run typecheck` — PASS
**Step 3:** `bun test` — PASS
**Step 4:** `bun run desktop:typecheck && bun run desktop:lint` — PASS
**Step 5:** `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` + `cargo check -p glimpse-bridge -p glimpse-core` — PASS
**Step 6:** 스모크: `bun run web` (웹 번들 정상 기동 확인 후 Ctrl+C)
**Step 7:** 요약 + (사용자 승인 시) push

## 범위 외 (백로그)

- 영구 벡터 저장소 (Rust 코어 sqlite 확장)
- 모바일 BYOK 채팅 스트리밍
- 실모델/실네트워크 자동 테스트 인프라
- 데스크톱 AI 라벨링 (provider 배선)
- `RECEIVE_BOOT_COMPLETED` 정식 prebuild 재실행
