import { QueryClientProvider } from '@tanstack/react-query';
import { CoreClientContext } from './core-client-context';
import { queryClient } from './query-client';
import type { CoreClient } from '@glimpse/shared';
import type { ReactNode } from 'react';

export function GlimpseProvider({
  coreClient,
  children,
}: {
  coreClient: CoreClient;
  children: ReactNode;
}) {
  return (
    <CoreClientContext.Provider value={coreClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </CoreClientContext.Provider>
  );
}
