import { useEffect } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initThemePreference } from '@/hooks/useThemePreference';
import '../styles/globals.css';

export const Route = createRootRoute({
  component: function RootLayout() {
    // 저장된 테마(또는 시스템)를 `.dark` 클래스로 반영 — 시스템 변경도 추적
    useEffect(() => initThemePreference(), []);
    return (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    );
  },
});
