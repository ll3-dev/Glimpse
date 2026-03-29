import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '../styles/globals.css';

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  ),
});
