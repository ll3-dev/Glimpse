import { useNavigate } from '@tanstack/react-router';
import {
  useConversationsQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
} from '@glimpse/hooks';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

function formatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ConversationList() {
  const { data: conversations, isLoading } = useConversationsQuery();
  const createConversation = useCreateConversationMutation();
  const deleteConversation = useDeleteConversationMutation();
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const now = Date.now();
    const conversation = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      icon: null,
      contextItemId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const created = await createConversation.mutateAsync(conversation);
    navigate({ to: '/chat/$conversationId', params: { conversationId: created.id } });
  }, [createConversation, navigate]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation.mutateAsync({ id, deletedAt: Date.now() });
      setConfirmDeleteId(null);
    },
    [deleteConversation]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Loading conversations...</p>
      </div>
    );
  }

  const activeConversations =
    conversations
      ?.filter((c) => c.deletedAt === null)
      .sort((a, b) => b.updatedAt - a.updatedAt) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Conversations</h2>
        <Button variant="ghost" size="icon-sm" onClick={handleCreate} aria-label="New chat">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {activeConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-muted-foreground">
            <MessageSquare className="h-10 w-10" />
            <p className="text-center text-sm">
              No conversations yet.
              <br />
              Start a new chat!
            </p>
            <Button variant="outline" size="sm" onClick={handleCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Chat
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activeConversations.map((conv) => (
              <li key={conv.id} className="group">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: '/chat/$conversationId',
                      params: { conversationId: conv.id },
                    })
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {conv.title ?? 'Untitled'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conv.updatedAt)}
                    </p>
                  </div>
                  <div
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {confirmDeleteId === conv.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => handleDelete(conv.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setConfirmDeleteId(conv.id)}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
