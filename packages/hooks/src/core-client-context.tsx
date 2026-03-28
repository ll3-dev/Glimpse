import { createContext, useContext } from 'react';
import type { CoreClient } from '@glimpse/shared';

export const CoreClientContext = createContext<CoreClient | null>(null);

export function useCoreClient(): CoreClient {
  const client = useContext(CoreClientContext);
  if (!client) throw new Error('CoreClientContext not provided');
  return client;
}
