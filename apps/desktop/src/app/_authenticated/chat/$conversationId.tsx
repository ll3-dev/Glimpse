import { createFileRoute } from '@tanstack/react-router';
import { ChatView } from '@/components/chat/ChatView';

export const Route = createFileRoute('/_authenticated/chat/$conversationId')({
  component: function ChatConversationPage() {
    const { conversationId } = Route.useParams();
    return <ChatView conversationId={conversationId} />;
  },
});
