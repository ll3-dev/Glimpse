import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/library/$itemId')({
  component: () => <div>Library Item Detail</div>,
});
