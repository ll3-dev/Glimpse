import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo, useCallback } from 'react';
import { useKnowledgeItemsQuery } from '@glimpse/hooks';
import { filterKnowledgeItems } from '@glimpse/features/search';
import { useDesktopSemanticRerank } from '@/features/search/useSemanticRerank';
import { SearchBar } from '@/components/library/SearchBar';
import { KnowledgeItemList } from '@/components/library/KnowledgeItemList';

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
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <span className="text-sm text-muted-foreground">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          {semantic.active ? ' · 의미 정렬' : ''}
        </span>
      </div>
      <SearchBar onSearch={setSearchQuery} />
      <div className="flex-1 overflow-y-auto">
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
