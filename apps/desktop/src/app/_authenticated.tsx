import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MainPanel } from '@/components/layout/MainPanel';
import { useForegroundLabeling } from '@/hooks/useForegroundLabeling';
import { useKnowledgeGraphAutomation } from '@/hooks/useKnowledgeGraphAutomation';
import { useAppReviewReminder } from '@/hooks/useAppReviewReminder';
import { useLabelingBackfill } from '@glimpse/hooks';
import { desktopBackfillStorage } from '@/features/labeling/backfill-storage';

export const Route = createFileRoute('/_authenticated')({
  component: function AuthenticatedLayout() {
    useForegroundLabeling();
    useKnowledgeGraphAutomation();
    useAppReviewReminder();
    // GlimpseProvider(coreClient) 안에서 실행된다
    useLabelingBackfill(desktopBackfillStorage);

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
