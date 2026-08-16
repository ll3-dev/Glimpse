import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { GlimpseProvider } from '@glimpse/hooks';
import { configure } from '@rustra/types';
import { createTauriEngine } from '@rustra/tauri';
import { invoke } from '@tauri-apps/api/core';
import { createRustraCoreClient } from './features/core/rustra-core-client';

// Route every generated rustra command through the single `rustra_dispatch`
// Tauri command registered in src-tauri/src/main.rs. The wrapper adapts
// tauri's narrower `InvokeArgs` parameter to the engine's `unknown`.
configure(
  createTauriEngine({
    invoke: (command, args) => invoke(command, args as never),
  }),
);

const coreClient = createRustraCoreClient();
const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Desktop root element not found');
}

createRoot(rootElement).render(
  <GlimpseProvider coreClient={coreClient}>
    <RouterProvider router={router} />
  </GlimpseProvider>,
);
