---
date: 2026-02-17
author: loopy
status: approved
type: feature
priority: high
---

# Settings → Provider 연동 디자인

## 문제

1. Local LLM 설정 UI가 없음
2. 설정 토글이 router에 반영되지 않음
3. Store와 Provider가 분리되어 있어 설정 변경이 실제 동작에 영향 없음

## 해결 목표

Store → Provider → Router를 모두 연결하여 설정 UI의 토글이 실제 메타데이터 생성 경로에 반영되도록 한다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Settings Screen                         │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│  │ AppleIntelligence│ │   LocalLLM       │ │    BYOK      │ │
│  │     Section      │ │    Section       │ │   Section    │ │
│  └────────┬─────────┘ └────────┬─────────┘ └──────┬───────┘ │
└───────────┼───────────────────┼───────────────────┼─────────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Settings Feature Layer                    │
│  (통합 export: useAppleConfig, useLocalLLMConfig, useBYOK)  │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ appleIntel.store│ │ local-llm.store │ │   byok.store    │
│  - enabled      │ │  - enabled      │ │  - enabled      │
│  - available    │ │  - selectedId   │ │  - provider     │
└────────┬────────┘ │  - models[]     │ │  - apiKey       │
         │          └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Provider isAvailable()                    │
│  apple: store.enabled && deviceSupports()                   │
│  local: store.enabled && store.selectedModelId              │
│  byok:  store.enabled && store.apiKey                       │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
                    ┌───────────────┐
                    │    Router     │
                    │ (자동 선택)   │
                    └───────────────┘
```

**핵심 원칙:**
- Store가 단일 진실 공급원 (SSOT)
- Provider는 store를 구독하지 않고, 호출 시점에 store 상태를 읽음
- UI는 store를 통해 상태를 읽고 씀

## 파일 변경사항

```
src/
├── features/settings/
│   ├── index.ts                    # + Local LLM export 추가
│   ├── byokSettings.ts             # (기존)
│   ├── appleIntelligenceToggle.ts  # (기존)
│   └── localLLMSettings.ts         # NEW: Local LLM feature 레이어
│
├── components/settings/
│   ├── AppleIntelligenceSection.tsx # (기존)
│   ├── BYOKSection.tsx             # (기존)
│   ├── LocalLLMSection.tsx         # NEW: Local LLM UI
│   └── useSettingsScreenState.ts   # + Local LLM 상태 추가
│
├── features/ai/providers/
│   ├── apple-provider.ts           # 수정: store 확인
│   ├── local-llm-provider.ts       # 수정: store 확인
│   └── byok-provider.ts            # 수정: store 확인
│
└── app/settings.tsx                # 수정: LocalLLMSection 추가
```

## 데이터 플로우

### UI → Store (설정 변경)

```
사용자가 토글 ON
    │
    ▼
LocalLLMSection의 onToggle(true)
    │
    ▼
setLocalLLMEnabled(true)  ← settings feature 함수
    │
    ▼
local-llm.store.ts: config.enabled = true
```

### Router → Provider → Store (생성 요청)

```
metadataRouter.generate(input)
    │
    ▼
for (provider of [apple, local, byok, stub])
    │
    ├──▶ appleProvider.isAvailable()
    │        │
    │        ▼
    │    getAppleIntelligenceConfig().enabled && deviceCheck()
    │
    ├──▶ localLLMProvider.isAvailable()
    │        │
    │        ▼
    │    getLocalLLMStoreConfig().enabled && selectedModelId
    │
    └──▶ byokProvider.isAvailable()
             │
             ▼
         getBYOKConfig().enabled && apiKey
```

## LocalLLMSection UI 구성

```
┌─────────────────────────────────────────────┐
│ 🤖 로컬 LLM                                  │
├─────────────────────────────────────────────┤
│ [Toggle] 로컬 모델 사용                      │
│                                             │
│ 모델 선택                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ ○ Llama 3.2 1B (다운로드됨)             │ │
│ │ ○ Llama 3.2 3B (다운로드 필요)          │ │
│ │ ○ 사용자 모델 추가...                   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ⓘ Apple Silicon Mac 또는 iOS 18+ 필요      │
└─────────────────────────────────────────────┘
```

## 에러 처리

### UI 레벨

| 상황 | 처리 |
|------|------|
| Local LLM ON + 모델 미선택 | 토글 차단 + "모델을 먼저 선택해주세요" 알림 |
| 모델 다운로드 실패 | 모델 카드에 "다운로드 실패" 표시 |
| 기기 미지원 | 섹션 전체 dimmed + "이 기기에서는 지원되지 않습니다" |

### Provider 레벨

| 상황 | 처리 |
|------|------|
| `isAvailable()` 예외 | Router가 catch → 다음 provider로 fallback |
| `generate()` 실패 | Router가 에러 기록 → 다음 provider로 fallback |
| Store 읽기 실패 | `isAvailable()`이 false 반환 (안전하게 처리) |

## 테스트 계획

### 단위 테스트

| 파일 | 테스트 케이스 |
|------|-------------|
| `localLLMSettings.test.ts` | - toggle 동작<br>- 모델 선택 시 enabled 자동 체크<br>- validation 함수 |
| `local-llm-provider.test.ts` | - `isAvailable()` store 연동<br>- enabled=false → false<br>- enabled=true, model 없음 → false<br>- enabled=true, model 있음 → true |

### 통합 테스트

```typescript
describe('Settings → Provider 연동', () => {
  it('Local LLM 토글 ON하면 provider가 available해진다', () => {
    addLocalLLMModel({ id: 'llama-1b', name: 'Llama 1B', isReady: true });
    selectLocalLLMModel('llama-1b');

    expect(localLLMProvider.isAvailable()).resolves.toBe(false);

    setLocalLLMEnabled(true);

    expect(localLLMProvider.isAvailable()).resolves.toBe(true);
  });
});
```

## 범위 제한

- 새로운 모델 다운로드 기능은 제외 (UI만)
- 실제 추론 로직은 제외
- 영속성 마이그레이션은 제외
