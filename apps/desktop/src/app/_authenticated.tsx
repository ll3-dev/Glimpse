import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MainPanel } from '@/components/layout/MainPanel';
import { useForegroundLabeling } from '@/hooks/useForegroundLabeling';

export const Route = createFileRoute('/_authenticated')({
  component: function AuthenticatedLayout() {
    useForegroundLabeling();

    return (
      <div className="flex h-screen">
        <AppSidebar />
        <MainPanel>
          <Outlet />
        </MainPanel>
      </div>
    );
  },
});
