import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/digest')({
  component: () => <div>Digest</div>,
});
