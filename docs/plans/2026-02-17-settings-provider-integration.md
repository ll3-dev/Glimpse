# Settings → Provider 연동 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Local LLM 설정 UI를 추가하고, 모든 Provider가 store 상태를 반영하도록 연결

**Architecture:** Store → Selector → Provider → Router 구조. UI는 Selector를 통해 상태를 읽고 Commands를 통해 변경.

**Tech Stack:** React Native, Zustand, TypeScript

---

## Task 1: Local LLM Export 추가

**Files:**
- Modify: `src/features/settings/index.ts`

**Step 1: Local LLM selectors/commands export 추가**

```typescript
// src/features/settings/index.ts 기존 내용 뒤에 추가

export {
  // Types
  type LocalLLMConfig,
  type LocalModel,
  // Selectors
  getLocalLLMConfig,
  useLocalLLMConfig,
  isLocalLLMEnabled,
  useLocalLLMEnabled,
  isLocalLLMReady,
  useLocalLLMReady,
  getSelectedLocalModel,
  useSelectedLocalModel,
  getAvailableLocalModels,
  useAvailableLocalModels,
  getSelectedLocalModelId,
  useSelectedLocalModelId,
  // Commands
  enableLocalLLM,
  disableLocalLLM,
  selectModel,
  addModel,
  removeModel,
  updateModel,
  markModelReady,
  clearLocalLLMSettings,
  setAvailableModels,
} from './local-llm.selectors';

// Re-export commands from local-llm.commands
export {
  enableLocalLLM,
  disableLocalLLM,
  selectModel as selectLocalLLMModel,
  addModel as addLocalLLMModel,
  removeModel as removeLocalLLMModel,
  updateModel as updateLocalLLMModel,
  markModelReady,
  clearLocalLLMSettings,
  setAvailableModels,
} from './local-llm.commands';
```

**Step 2: lint 확인**

Run: `bun run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/settings/index.ts
git commit -m "feat(settings): Local LLM selectors/commands export 추가"
```

---

## Task 2: LocalLLMSection 컴포넌트 생성

**Files:**
- Create: `src/components/settings/LocalLLMSection.tsx`

**Step 1: LocalLLMSection 컴포넌트 작성**

```typescript
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Bot, Check } from 'lucide-react-native';
import { Card } from '@/src/ui/primitives';
import type { LocalModel } from '@/src/features/settings';

type LocalLLMSectionProps = {
  enabled: boolean;
  ready: boolean;
  models: LocalModel[];
  selectedModelId: string | null;
  onToggle: (value: boolean) => void;
  onSelectModel: (modelId: string) => void;
};

export function LocalLLMSection({
  enabled,
  ready,
  models,
  selectedModelId,
  onToggle,
  onSelectModel,
}: LocalLLMSectionProps) {
  const hasModels = models.length > 0;

  return (
    <View className="mb-8">
      <View className="flex-row items-center mb-3">
        <Bot size={18} color="#787774" />
        <Text className="ml-2 text-sm font-bold text-app-muted uppercase tracking-tight">
          로컬 LLM
        </Text>
      </View>

      <Card className="p-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 pr-4">
            <Text className="text-base font-semibold text-app-text">로컬 모델 사용</Text>
            <Text className="text-xs text-app-muted mt-0.5">
              기기에서 직접 실행되는 AI 모델
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            disabled={!ready && !enabled}
            trackColor={{ false: '#e5e5e5', true: '#2383e2' }}
            thumbColor="#fff"
          />
        </View>

        {hasModels && (
          <View>
            <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
              모델 선택
            </Text>
            {models.map((model) => (
              <TouchableOpacity
                key={model.id}
                className={`flex-row items-center justify-between p-3 rounded-md border mb-2 ${
                  selectedModelId === model.id
                    ? 'bg-app-primary/10 border-app-primary'
                    : 'bg-white border-app-border'
                }`}
                onPress={() => onSelectModel(model.id)}
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-app-text">{model.name}</Text>
                  {!model.isReady && (
                    <Text className="text-[10px] text-orange-500 mt-0.5">다운로드 필요</Text>
                  )}
                </View>
                {selectedModelId === model.id && <Check size={16} color="#2383e2" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!hasModels && (
          <View className="py-4 items-center">
            <Text className="text-xs text-app-muted">사용 가능한 모델이 없습니다</Text>
            <Text className="text-[10px] text-app-subtle mt-1">
              모델 다운로드 기능은 추후 지원 예정
            </Text>
          </View>
        )}
      </Card>

      <Text className="mt-2 text-[10px] text-app-subtle font-medium text-center">
        ⓘ Apple Silicon Mac 또는 iOS 18+에서 사용할 수 있습니다
      </Text>
    </View>
  );
}
```

**Step 2: lint 확인**

Run: `bun run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/settings/LocalLLMSection.tsx
git commit -m "feat(settings): LocalLLMSection 컴포넌트 추가"
```

---

## Task 3: useSettingsScreenState에 Local LLM 상태 추가

**Files:**
- Modify: `src/components/settings/useSettingsScreenState.ts`

**Step 1: Local LLM import 추가**

```typescript
// 기존 imports 뒤에 추가
import {
  // ... 기존 BYOK imports
  BYOKProvider,
  disableBYOK,
  enableBYOK,
  setApiKey,
  setAppleIntelligenceEnabled,
  setProvider,
  useAppleIntelligenceConfig,
  useBYOKConfig,
  useBYOKCredentialsConfigured,
  useBYOKReady,
  type BYOKProviderType,
  // Local LLM 추가
  useLocalLLMEnabled,
  useLocalLLMReady,
  useAvailableLocalModels,
  useSelectedLocalModelId,
  enableLocalLLM,
  disableLocalLLM,
  selectLocalLLMModel,
} from '@/src/features/settings';
```

**Step 2: Local LLM 상태 및 액션 추가**

```typescript
// useSettingsScreenState 함수 내부, 기존 state/hooks 뒤에 추가

// Local LLM state
const localLLMEnabled = useLocalLLMEnabled();
const localLLMReady = useLocalLLMReady();
const localLLMModels = useAvailableLocalModels();
const localLLMSelectedModelId = useSelectedLocalModelId();

// Local LLM actions
const toggleLocalLLM = useCallback((value: boolean): ActionFeedback | null => {
  if (value) {
    const result = enableLocalLLM();
    if (!result.success) {
      return {
        title: '활성화 실패',
        message: result.error ?? '로컬 LLM을 활성화할 수 없습니다.',
      };
    }
  } else {
    disableLocalLLM();
  }
  return null;
}, []);

const selectLocalModel = useCallback((modelId: string) => {
  selectLocalLLMModel(modelId);
}, []);
```

**Step 3: return 문에 추가**

```typescript
return {
  state: {
    // 기존 상태들...
    byokEnabled,
    selectedProvider,
    apiKeyInput,
    showKey,
    byokReady,
    byokConfigured,
    appleConfig,
    providers: BYOKProvider,
    // Local LLM 추가
    localLLMEnabled,
    localLLMReady,
    localLLMModels,
    localLLMSelectedModelId,
  },
  actions: {
    // 기존 액션들...
    setApiKeyInput,
    setShowKey,
    toggleBYOK,
    selectProvider,
    saveApiKey,
    toggleAppleIntelligence,
    // Local LLM 추가
    toggleLocalLLM,
    selectLocalModel,
  },
};
```

**Step 4: lint 확인**

Run: `bun run lint`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/settings/useSettingsScreenState.ts
git commit -m "feat(settings): Local LLM 상태 관리 hook에 추가"
```

---

## Task 4: Settings 화면에 LocalLLMSection 추가

**Files:**
- Modify: `app/settings.tsx`

**Step 1: LocalLLMSection import 추가**

```typescript
// 기존 imports에 추가
import { LocalLLMSection } from '@/src/components/settings/LocalLLMSection';
```

**Step 2: LocalLLMSection 렌더링 추가 (AppleIntelligenceSection과 BYOKSection 사이)**

```typescript
// ScrollView 내부, AppleIntelligenceSection 뒤에 추가
<AppleIntelligenceSection
  config={state.appleConfig}
  onToggle={handleToggleAppleIntelligence}
/>

<LocalLLMSection
  enabled={state.localLLMEnabled}
  ready={state.localLLMReady}
  models={state.localLLMModels}
  selectedModelId={state.localLLMSelectedModelId}
  onToggle={handleToggleLocalLLM}
  onSelectModel={actions.selectLocalModel}
/>

<BYOKSection
  // ... 기존 props
/>
```

**Step 3: handleToggleLocalLLM 핸들러 추가**

```typescript
// 기존 핸들러들 뒤에 추가
const handleToggleLocalLLM = (value: boolean) => {
  const feedback = actions.toggleLocalLLM(value);
  if (feedback) {
    Alert.alert(feedback.title, feedback.message);
  }
};
```

**Step 4: lint 확인**

Run: `bun run lint`
Expected: No errors

**Step 5: Commit**

```bash
git add app/settings.tsx
git commit -m "feat(settings): LocalLLMSection 화면에 추가"
```

---

## Task 5: 통합 테스트

**Files:**
- Create: `src/components/settings/useSettingsScreenState.local-llm.test.ts`

**Step 1: 테스트 파일 작성**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react-hooks';
import { useSettingsScreenState } from './useSettingsScreenState';
import {
  clearLocalLLMSettings,
  addModel,
  selectLocalLLMModel,
  setLocalLLMEnabled,
} from '@/src/features/settings';

describe('useSettingsScreenState - Local LLM', () => {
  beforeEach(() => {
    clearLocalLLMSettings();
  });

  it('Local LLM 초기 상태가 올바르다', () => {
    const { result } = renderHook(() => useSettingsScreenState());

    expect(result.current.state.localLLMEnabled).toBe(false);
    expect(result.current.state.localLLMReady).toBe(false);
    expect(result.current.state.localLLMModels).toEqual([]);
    expect(result.current.state.localLLMSelectedModelId).toBeNull();
  });

  it('모델이 있고 선택되면 ready가 true가 된다', () => {
    // Setup
    addModel({ id: 'test-model', name: 'Test Model', isReady: true });
    selectLocalLLMModel('test-model');

    const { result } = renderHook(() => useSettingsScreenState());

    expect(result.current.state.localLLMReady).toBe(true);
    expect(result.current.state.localLLMSelectedModelId).toBe('test-model');
  });

  it('toggleLocalLLM이 enabled 상태를 변경한다', () => {
    // Setup
    addModel({ id: 'test-model', name: 'Test Model', isReady: true });
    selectLocalLLMModel('test-model');

    const { result } = renderHook(() => useSettingsScreenState());

    act(() => {
      result.current.actions.toggleLocalLLM(true);
    });

    expect(result.current.state.localLLMEnabled).toBe(true);
  });

  it('모델 없이 toggle 시 에러를 반환한다', () => {
    const { result } = renderHook(() => useSettingsScreenState());

    let feedback: { title: string; message: string } | null = null;
    act(() => {
      feedback = result.current.actions.toggleLocalLLM(true);
    });

    expect(feedback).not.toBeNull();
    expect(feedback?.title).toBe('활성화 실패');
  });
});
```

**Step 2: 테스트 실행**

Run: `bun test src/components/settings/useSettingsScreenState.local-llm.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/components/settings/useSettingsScreenState.local-llm.test.ts
git commit -m "test(settings): Local LLM 상태 관리 테스트 추가"
```

---

## Task 6: Provider 연동 검증 테스트

**Files:**
- Modify: `src/features/ai/providers/local-llm-provider.test.ts`

**Step 1: Store 연동 테스트 추가**

```typescript
// 기존 테스트 파일에 추가
import {
  clearLocalLLMSettings,
  addModel,
  selectLocalLLMModel,
  setLocalLLMEnabled,
} from '@/src/features/settings';

describe('local-llm-provider store integration', () => {
  beforeEach(() => {
    clearLocalLLMSettings();
  });

  it('enabled=false면 isAvailable이 false를 반환한다', async () => {
    addModel({ id: 'test', name: 'Test', isReady: true });
    selectLocalLLMModel('test');
    // enabled는 기본값 false

    const provider = createLocalLLMProvider();
    const available = await provider.isAvailable();

    expect(available).toBe(false);
  });

  it('모델이 선택되지 않으면 isAvailable이 false를 반환한다', async () => {
    addModel({ id: 'test', name: 'Test', isReady: true });
    setLocalLLMEnabled(true);
    // 모델 선택 안 함

    const provider = createLocalLLMProvider();
    const available = await provider.isAvailable();

    expect(available).toBe(false);
  });

  it('enabled + model selected + model ready면 isAvailable이 true를 반환한다', async () => {
    addModel({ id: 'test', name: 'Test', isReady: true });
    selectLocalLLMModel('test');
    setLocalLLMEnabled(true);

    const provider = createLocalLLMProvider();
    const available = await provider.isAvailable();

    expect(available).toBe(true);
  });
});
```

**Step 2: 테스트 실행**

Run: `bun test src/features/ai/providers/local-llm-provider.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/features/ai/providers/local-llm-provider.test.ts
git commit -m "test(ai): Local LLM provider store 연동 테스트 추가"
```

---

## Task 7: 최종 검증

**Step 1: 전체 lint 실행**

Run: `bun run lint`
Expected: No errors

**Step 2: 전체 테스트 실행**

Run: `bun test`
Expected: All tests pass

**Step 3: 앱 실행해서 UI 확인**

Run: `bun run ios` 또는 `bun run web`
Expected: 설정 화면에 로컬 LLM 섹션이 보이고 토글 동작

**Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat(settings): Local LLM UI 및 Provider 연동 완료"
```
