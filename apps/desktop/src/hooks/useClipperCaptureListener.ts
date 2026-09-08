import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { queryKeys } from '@glimpse/hooks';

/**
 * 웹 클리퍼 캡처 이벤트 소비 — 브라우저 확장이 Rust 동기화 서버의
 * `/v1/clipper`로 저장하면 웹뷰의 react-query 캐시를 무효화해 보관함이
 * 곧바로 반영되게 한다. 저장 자체는 Rust(core_state)가 담당하므로 여기서는
 * 읽기 캐시 갱신만 한다.
 */
export function useClipperCaptureListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let disposed = false;
    const unlistens: Array<() => void> = [];
    const track = (fn: () => void) => {
      if (disposed) fn();
      else unlistens.push(fn);
    };

    listen<{ itemId: string }>('glimpse://clipper-captured', () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
    })
      .then((fn) => track(fn))
      .catch((error) => {
        // 이벤트 버스 미가동(테스트·비Tauri 환경) — 조용히 건너뛴다.
        console.warn('[clipper] capture listener unavailable:', error);
      });

    return () => {
      disposed = true;
      unlistens.forEach((fn) => fn());
    };
  }, [queryClient]);
}
