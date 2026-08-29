import { useEffect } from 'react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MainPanel } from '@/components/layout/MainPanel';
import { useForegroundLabeling } from '@/hooks/useForegroundLabeling';
import { useKnowledgeGraphAutomation } from '@/hooks/useKnowledgeGraphAutomation';
import { useAppReviewReminder } from '@/hooks/useAppReviewReminder';
import { useLabelingBackfill } from '@glimpse/hooks';
import { desktopBackfillStorage } from '@/features/labeling/backfill-storage';

export const Route = createFileRoute('/_authenticated')({
  component: function AuthenticatedLayout() {
    const navigate = useNavigate();
    useForegroundLabeling();
    useKnowledgeGraphAutomation();
    useAppReviewReminder();
    // GlimpseProvider(coreClient) 안에서 실행된다
    useLabelingBackfill(desktopBackfillStorage);

    // Global desktop shortcuts: ⌘K (Search) & ⌘N (New Capture)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const isMeta = e.metaKey || e.ctrlKey;
        if (isMeta && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          navigate({ to: '/library' });
        } else if (isMeta && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          navigate({ to: '/capture' });
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <MainPanel>
          <Outlet />
        </MainPanel>
      </div>
    );
  },
});
