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
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('ko-KR', {
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
      title: '새 대화',
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
        <p className="text-sm">대화 목록을 불러오는 중...</p>
      </div>
    );
  }

  const activeConversations =
    conversations
      ?.filter((c) => c.deletedAt === null)
      .sort((a, b) => b.updatedAt - a.updatedAt) ?? [];

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col p-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">채팅</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            저장된 지식을 기반으로 AI와 대화하고 탐색합니다.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleCreate}
          aria-label="새 대화 시작"
          className="gap-1.5 rounded-lg bg-app-text text-app-bg hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          새 대화
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pt-4">
        {activeConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs">
              <MessageSquare className="h-6 w-6 opacity-70" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">대화 내역이 없습니다</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              새 대화를 시작하여 지식에 대해 물어보세요.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreate}
              className="mt-4 gap-1.5 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
              대화 시작하기
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeConversations.map((conv) => (
              <div
                key={conv.id}
                className="group relative flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-foreground/20 hover:bg-muted/30 hover:shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: '/chat/$conversationId',
                      params: { conversationId: conv.id },
                    })
                  }
                  className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-muted-foreground group-hover:text-foreground">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {conv.title ?? '새 대화'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conv.updatedAt)}
                    </p>
                  </div>
                </button>

                <div
                  className="shrink-0 pl-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {confirmDeleteId === conv.id ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDelete(conv.id)}
                      >
                        삭제
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        취소
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setConfirmDeleteId(conv.id)}
                      aria-label="대화 삭제"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
