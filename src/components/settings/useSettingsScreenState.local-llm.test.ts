/**
 * Local LLM 상태 관리 통합 테스트
 *
 * useSettingsScreenState hook이 Local LLM 상태를 올바르게 관리하는지 테스트합니다.
 * 내부적으로 사용하는 selectors와 commands를 직접 테스트하여 hook 동작을 검증합니다.
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import {
  clearLocalLLMSettings,
  addLocalLLMModel,
  selectLocalLLMModel,
  enableLocalLLM,
  disableLocalLLM,
  getLocalLLMConfig,
  isLocalLLMEnabled,
  isLocalLLMReady,
  getSelectedLocalModelId,
  getAvailableLocalModels,
} from '@/src/features/settings';

describe('Local LLM 상태 관리', () => {
  beforeEach(() => {
    clearLocalLLMSettings();
  });

  describe('초기 상태', () => {
    test('Local LLM 초기 상태가 올바르다', () => {
      const config = getLocalLLMConfig();

      expect(config.enabled).toBe(false);
      expect(isLocalLLMEnabled()).toBe(false);
      expect(isLocalLLMReady()).toBe(false);
      expect(getAvailableLocalModels()).toEqual([]);
      expect(getSelectedLocalModelId()).toBeNull();
    });
  });

  describe('모델 선택 및 ready 상태', () => {
    test('모델이 있고 선택되고 enabled이면 ready가 true가 된다', () => {
      // Setup: 모델 추가, 선택, enable
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: true });
      selectLocalLLMModel('test-model');
      enableLocalLLM();

      expect(isLocalLLMReady()).toBe(true);
      expect(getSelectedLocalModelId()).toBe('test-model');
    });

    test('enabled가 아니면 ready는 false다', () => {
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: true });
      selectLocalLLMModel('test-model');
      // enabled = false

      expect(isLocalLLMReady()).toBe(false);
    });

    test('모델이 ready 상태가 아니면 ready는 false다', () => {
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: false });
      selectLocalLLMModel('test-model');
      enableLocalLLM();

      expect(isLocalLLMReady()).toBe(false);
    });

    test('모델이 선택되지 않으면 ready는 false다', () => {
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: true });
      // 선택하지 않음

      expect(isLocalLLMReady()).toBe(false);
    });
  });

  describe('toggleLocalLLM 동작 (enableLocalLLM/disableLocalLLM)', () => {
    test('모델이 있고 선택된 상태에서 enable이 성공하고 enabled가 true가 된다', () => {
      // Setup
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: true });
      selectLocalLLMModel('test-model');

      // Enable
      const result = enableLocalLLM();
      expect(result.success).toBe(true);
      expect(isLocalLLMEnabled()).toBe(true);
    });

    test('모델 없이 enable 시 에러를 반환한다', () => {
      const result = enableLocalLLM();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toBe('모델을 먼저 선택해주세요');
    });

    test('선택된 모델이 없으면 enable 시 에러를 반환한다', () => {
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: true });
      // 선택하지 않음

      const result = enableLocalLLM();
      expect(result.success).toBe(false);
      expect(result.error).toBe('모델을 먼저 선택해주세요');
    });

    test('선택된 모델이 ready 상태가 아니면 에러를 반환한다', () => {
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: false });
      selectLocalLLMModel('test-model');

      const result = enableLocalLLM();
      expect(result.success).toBe(false);
      expect(result.error).toBe('모델이 아직 다운로드되지 않았습니다');
    });

    test('disable이 항상 성공한다', () => {
      // 먼저 enable 설정
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: true });
      selectLocalLLMModel('test-model');
      enableLocalLLM();
      expect(isLocalLLMEnabled()).toBe(true);

      // Disable
      disableLocalLLM();
      expect(isLocalLLMEnabled()).toBe(false);
    });
  });

  describe('모델 관리', () => {
    test('여러 모델을 추가할 수 있다', () => {
      addLocalLLMModel({ id: 'model-1', name: 'Model 1', isReady: true });
      addLocalLLMModel({ id: 'model-2', name: 'Model 2', isReady: false });

      const models = getAvailableLocalModels();
      expect(models).toHaveLength(2);
      expect(models.map((m) => m.id)).toEqual(['model-1', 'model-2']);
    });

    test('존재하지 않는 모델 선택 시 에러를 반환한다', () => {
      const result = selectLocalLLMModel('non-existent-model');
      expect(result.success).toBe(false);
      expect(result.error).toBe('존재하지 않는 모델입니다');
    });

    test('null로 선택을 해제할 수 있다', () => {
      addLocalLLMModel({ id: 'test-model', name: 'Test Model', isReady: true });
      selectLocalLLMModel('test-model');
      expect(getSelectedLocalModelId()).toBe('test-model');

      const result = selectLocalLLMModel(null);
      expect(result.success).toBe(true);
      expect(getSelectedLocalModelId()).toBeNull();
    });
  });
});
