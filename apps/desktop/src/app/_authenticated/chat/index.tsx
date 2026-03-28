import { createFileRoute } from '@tanstack/react-router';
import { ConversationList } from '@/components/chat/ConversationList';

export const Route = createFileRoute('/_authenticated/chat/')({
  component: function ChatIndexPage() {
    return <ConversationList />;
  },
});
