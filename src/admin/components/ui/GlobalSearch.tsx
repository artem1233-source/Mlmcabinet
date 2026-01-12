import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { globalSearch, formatSearchResult, debounce, type SearchResult, type SearchScope } from '../../utils/searchUtils';

interface GlobalSearchProps {
  searchScope: SearchScope | 'all';
  data: {
    users?: any[];
    orders?: any[];
    payouts?: any[];
    products?: any[];
  };
  onResultClick?: (result: SearchResult) => void;
}

export function GlobalSearch({ searchScope, data, onResultClick }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Дебаунс поиска
  const performSearch = debounce(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const searchResults = await globalSearch(searchQuery, searchScope, data);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  useEffect(() => {
    performSearch(query);
  }, [query, searchScope]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setQuery('');
    if (onResultClick) {
      onResultClick(result);
    }
  };

  const getScopeLabel = (scope: SearchScope | 'all') => {
    const labels = {
      all: 'Везде',
      users: 'Пользователи',
      orders: 'Заказы',
      payouts: 'Выплаты',
      products: 'Товары'
    };
    return labels[scope] || 'Везде';
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
        <Input
          placeholder={`Поиск по ${getScopeLabel(searchScope).toLowerCase()}...`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10 pr-20 w-80 border-[#E6E9EE] rounded-xl"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#39B7FF] animate-spin" />
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E6E9EE] rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
          {isSearching && results.length === 0 && (
            <div className="p-4 text-center text-[#666]">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-[#39B7FF]" />
              <p className="text-sm">Поиск...</p>
            </div>
          )}

          {!isSearching && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-[#F7FAFC] rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-8 h-8 text-[#999]" />
              </div>
              <p className="font-semibold text-[#1E1E1E] mb-1">Ничего не найдено</p>
              <p className="text-sm text-[#666]">
                Попробуйте изменить запрос или выбрать другую область поиска
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => {
                const format = formatSearchResult(result);
                return (
                  <button
                    key={`${result.type}-${result.id}-${index}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 hover:bg-[#F7FAFC] transition-colors flex items-center gap-3 text-left"
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 ${format.iconColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className="text-lg">{format.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-[#1E1E1E] truncate">
                          {result.title}
                        </p>
                        <span className="text-xs text-[#999] bg-[#F7FAFC] px-2 py-0.5 rounded-full flex-shrink-0">
                          {format.typeLabel}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="text-sm text-[#666] truncate">{result.subtitle}</p>
                      )}
                      {result.meta && (
                        <p className="text-xs text-[#999] mt-0.5">{result.meta}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {results.length > 0 && (
            <div className="border-t border-[#E6E9EE] p-2 bg-[#F7FAFC]">
              <p className="text-xs text-center text-[#666]">
                Найдено результатов: {results.length}
                {results.length === 20 && ' (показаны первые 20)'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
