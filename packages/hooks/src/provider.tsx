import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoreClientContext } from './core-client-context';
import type { CoreClient } from '@glimpse/shared';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

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

export { queryClient };
