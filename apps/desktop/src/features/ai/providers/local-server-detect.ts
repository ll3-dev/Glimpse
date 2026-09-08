/**
 * 외부 로컬 서버 자동 감지 — LM Studio·Ollama·llama.cpp/mlx-lm 의
 * OpenAI 호환 엔드포인트를 포트 프로브로 발견한다.
 *
 * 감지 결과는 항상 사용자 확인형 원클릭("이 모델 사용")으로만 적용한다 —
 * 같은 포트를 쓰는 다른 서비스와의 오탐을 자동 적용으로 흡수하지 않는다
 * (2026-09-08 완전 로컬 전환 플랜의 리스크 대응).
 */

import { fetchWithTimeout } from './local-server-provider';

export type LocalServerId = 'lmstudio' | 'ollama' | 'llamacpp';

export interface LocalServerProbe {
  serverId: LocalServerId;
  label: string;
  baseUrl: string;
}

/** 관례적 기본 포트 — 감지 우선, 수동 URL 입력은 탈출구 */
export const LOCAL_SERVER_PROBES: LocalServerProbe[] = [
  { serverId: 'lmstudio', label: 'LM Studio', baseUrl: 'http://localhost:1234' },
  { serverId: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434' },
  { serverId: 'llamacpp', label: 'llama.cpp / mlx-lm', baseUrl: 'http://localhost:8080' },
];

export interface DetectedLocalServer extends LocalServerProbe {
  /** 서버가 로드한 모델 id 목록(/v1/models) — 첫 항목을 기본 선택으로 쓴다 */
  models: string[];
}

/** 감지 프로브 타임아웃 — 설정 화면 진입 지연을 만들지 않는 짧은 상한 */
const DETECT_TIMEOUT_MS = 1500;

function parseModelsPayload(data: unknown): string[] {
  const r = data as { data?: { id?: string }[] };
  return (r.data ?? [])
    .map((entry) => entry.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export async function detectLocalServers(options?: {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): Promise<DetectedLocalServer[]> {
  const fetchFn = options?.fetchFn ?? fetch;
  const timeoutMs = options?.timeoutMs ?? DETECT_TIMEOUT_MS;

  const results = await Promise.all(
    LOCAL_SERVER_PROBES.map(async (probe) => {
      try {
        const { response, timedOut } = await fetchWithTimeout(
          fetchFn,
          `${probe.baseUrl}/v1/models`,
          { method: 'GET' },
          timeoutMs,
        );
        if (timedOut || !response || !response.ok) return null;
        const models = parseModelsPayload(await response.json());
        if (models.length === 0) return null;
        return { ...probe, models };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((result): result is DetectedLocalServer => result !== null);
}
