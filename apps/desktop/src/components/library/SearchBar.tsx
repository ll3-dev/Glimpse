import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { parseQueryToKeyword } from '@glimpse/features/search';

/** 키 입력마다 전체 필터+재정렬이 도는 것을 막는 debounce. */
const SEARCH_DEBOUNCE_MS = 200;

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSearch(parseQueryToKeyword(v));
      }, SEARCH_DEBOUNCE_MS);
    },
    [onSearch],
  );

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="지식 검색... (키워드 또는 의미 검색)"
        aria-label="지식 검색"
        value={value}
        onChange={handleChange}
        className="h-9.5 rounded-xl border-border bg-card pl-9 pr-9 text-sm shadow-2xs transition-colors placeholder:text-muted-foreground/80 focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="검색어 지우기"
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
