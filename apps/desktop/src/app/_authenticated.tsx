import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MainPanel } from '@/components/layout/MainPanel';
import { useForegroundLabeling } from '@/hooks/useForegroundLabeling';
import { useKnowledgeGraphAutomation } from '@/hooks/useKnowledgeGraphAutomation';
import { useAppReviewReminder } from '@/hooks/useAppReviewReminder';

export const Route = createFileRoute('/_authenticated')({
  component: function AuthenticatedLayout() {
    useForegroundLabeling();
    useKnowledgeGraphAutomation();
    useAppReviewReminder();

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
