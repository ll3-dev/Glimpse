import { createFileRoute } from '@tanstack/react-router';
import { CaptureModal } from '@/components/capture/CaptureModal';

export const Route = createFileRoute('/capture')({
  component: function CaptureRoute() {
    return <CaptureModal />;
  },
});
