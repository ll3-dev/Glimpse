import { createFileRoute } from '@tanstack/react-router';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export const Route = createFileRoute('/_authenticated/settings')({
  component: function SettingsRoute() {
    return <SettingsPanel />;
  },
});
