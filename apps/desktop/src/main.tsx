import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { GlimpseProvider } from '@glimpse/hooks';
import { createDesktopCoreClient } from './features/core/desktop-core-client';

const coreClient = createDesktopCoreClient();
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
