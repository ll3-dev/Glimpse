import { beforeEach, describe, expect, test } from 'bun:test';
import { storage } from '@/src/lib/storage';
import { SecureStorageKeys, deleteSecureItem, setSecureItem } from '@/src/lib/secure-storage';

/**
 * byok.store 은 module-level zustand 싱글턴이라 테스트 간 상태가 공유된다.
 * beforeEach 에서 스토어 리셋 + SecureStore 키 제거로 격리한다.
 * 실제 부팅 흐름과 동일 순서로 검증한다: provider 는 MMKV 동기 로드,
 * apiKey 는 SecureStore 비동기 복원(hydration).
 */
describe('byok.store hydration gate', () => {
  beforeEach(async () => {
    // MMKV 는 다른 테스트 파일(예: registry.test)과 공유되는 module
    // 싱글턴 — BYOK 관련 키를 정리해 순서 의존성을 없앤다.
    storage.remove('byok_enabled');
    await deleteSecureItem(SecureStorageKeys.BYOK_API_KEY);
  });

  test('ensureBYOKHydrated 메모이제이션 — 두 번 호출해도 동일 프로미스', async () => {
    const { ensureBYOKHydrated, __resetBYOKHydrationForTests } = await import('./byok.store');
    __resetBYOKHydrationForTests();

    const first = ensureBYOKHydrated();
    const second = ensureBYOKHydrated();
    expect(first).toBe(second);
    await first;
  });

  test('hydration 완료 후 키가 스토어에 반영된다', async () => {
    const {
      ensureBYOKHydrated,
      getBYOKStoreConfig,
      resetBYOKStoreConfig,
      setBYOKProvider,
      __resetBYOKHydrationForTests,
    } = await import('./byok.store');

    resetBYOKStoreConfig();
    setBYOKProvider('openai');
    await setSecureItem(SecureStorageKeys.BYOK_API_KEY, 'sk-test-key');

    // hydration 전 — 키 없음(콜드스타트 직후 상태)
    expect(getBYOKStoreConfig().apiKey).toBeNull();

    __resetBYOKHydrationForTests();
    await ensureBYOKHydrated();

    const config = getBYOKStoreConfig();
    expect(config.apiKey).toBe('sk-test-key');
    expect(config.provider).toBe('openai');
    expect(config.enabled).toBe(true);
  });

  test('SecureStore에 키가 없으면 초기 상태를 유지한다', async () => {
    const {
      ensureBYOKHydrated,
      getBYOKStoreConfig,
      resetBYOKStoreConfig,
      __resetBYOKHydrationForTests,
    } = await import('./byok.store');

    resetBYOKStoreConfig();
    __resetBYOKHydrationForTests();
    await ensureBYOKHydrated();

    const config = getBYOKStoreConfig();
    expect(config.apiKey).toBeNull();
    expect(config.enabled).toBe(false);
  });
});
