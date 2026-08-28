import { createContext, useContext } from 'react';
import type { CoreClient } from '@glimpse/shared';

export const CoreClientContext = createContext<CoreClient | null>(null);

export function useCoreClient(): CoreClient {
  const client = useContext(CoreClientContext);
  if (!client) throw new Error('CoreClientContext not provided');
  return client;
}

/** 컨텍스트 미제공 환경(일부 플랫폼 셸)에서 null로 안전히 읽는 접근자. */
export function useOptionalCoreClient(): CoreClient | null {
  return useContext(CoreClientContext);
}
