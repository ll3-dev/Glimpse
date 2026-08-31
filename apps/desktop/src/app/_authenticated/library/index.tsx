import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo, useCallback } from 'react';
import { useKnowledgeItemsQuery } from '@glimpse/hooks';
import { filterKnowledgeItems } from '@glimpse/features/search';
import { useDesktopSemanticRerank } from '@/features/search/useSemanticRerank';
import { SearchBar } from '@/components/library/SearchBar';
import { KnowledgeItemList } from '@/components/library/KnowledgeItemList';
import { BookOpen, Network, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

function LibraryPage() {
  const { data: items, isLoading } = useKnowledgeItemsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const keywordMatches = useMemo(() => {
    if (!items) return [];
    if (!searchQuery) return items;
    return filterKnowledgeItems(items, searchQuery);
  }, [items, searchQuery]);

  // When an embedding model is loaded, keyword matches are re-ranked by
  // semantic similarity; otherwise this is a pass-through.
  const semantic = useDesktopSemanticRerank(keywordMatches, searchQuery);
  const filteredItems = semantic.items;

  const handleItemClick = useCallback(
    (id: string) => navigate({ to: '/library/$itemId', params: { itemId: id } }),
    [navigate],
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 p-8">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">보관함</h1>
            {semantic.active && (
              <span className="inline-flex items-center gap-1 rounded-md bg-tag-lavender-bg px-2 py-0.5 text-[11px] font-medium text-tag-lavender-text">
                <Sparkles className="h-3 w-3" />
                의미 정렬 활성
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            저장된 지식과 메모를 확인하고 검색합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {searchQuery && filteredItems[0] ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/graph', search: { focus: filteredItems[0].id } })}
            >
              <Network className="h-3.5 w-3.5" />
              그래프로 보기
            </Button>
          ) : null}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{filteredItems.length}개의 지식</span>
          </div>
        </div>
      </div>

      <SearchBar onSearch={setSearchQuery} />

      <div className="flex-1 overflow-y-auto pr-1">
        <KnowledgeItemList
          items={filteredItems}
          isLoading={isLoading}
          onItemClick={handleItemClick}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/library/')({
  component: LibraryPage,
});
