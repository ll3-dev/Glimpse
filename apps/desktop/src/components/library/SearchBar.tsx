import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { parseQueryToKeyword } from '@glimpse/features/search';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      const keyword = parseQueryToKeyword(v);
      onSearch(keyword);
    },
    [onSearch],
  );

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search knowledge items..."
        value={value}
        onChange={handleChange}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
