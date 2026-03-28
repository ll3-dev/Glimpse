import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/library/')({
  component: () => <div>Library</div>,
});
