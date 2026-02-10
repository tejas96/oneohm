'use client';

import { Search, X, Loader2 } from 'lucide-react';
import * as React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  /** Unique identifier */
  id: string;
  /** Result type/category */
  type: string;
  /** Primary text */
  title: string;
  /** Secondary text */
  subtitle?: string;
  /** Avatar configuration */
  avatar?: {
    initials: string;
    color?: string;
  };
  /** Custom icon instead of avatar */
  icon?: React.ReactNode;
}

export interface SearchResultGroup {
  /** Category name */
  category: string;
  /** Results in this category */
  results: SearchResult[];
}

export interface SearchInputProps {
  /** Controlled value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Show keyboard shortcut hint */
  showShortcut?: boolean;
  /** Keyboard shortcut text */
  shortcut?: string;
  /** Grouped search results */
  results?: SearchResultGroup[];
  /** Loading state */
  isLoading?: boolean;
  /** Called when search value changes */
  onSearch: (value: string) => void;
  /** Called when a result is clicked */
  onResultClick?: (result: SearchResult) => void;
  /** Called when "View all" is clicked */
  onViewAll?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Auto-focus input */
  autoFocus?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_CLASSES = {
  sm: {
    input: 'pl-8 pr-8 py-1.5 text-xs',
    icon: 'size-icon-sm left-2.5',
    clear: 'size-icon-2xs',
  },
  default: {
    input: 'pl-10 pr-10 py-2 text-sm',
    icon: 'size-icon-md left-3',
    clear: 'size-icon-sm',
  },
  lg: {
    input: 'pl-12 pr-12 py-3.5 text-base',
    icon: 'size-icon-lg left-4',
    clear: 'size-icon-md',
  },
} as const;

const AVATAR_COLORS: Record<string, string> = {
  primary: 'bg-primary text-white',
  blue: 'bg-info text-white',
  green: 'bg-success text-white',
  amber: 'bg-warning text-warning-foreground',
  red: 'bg-error text-white',
  default: 'bg-muted text-foreground',
};

// ============================================================================
// Highlight Component
// ============================================================================

interface HighlightTextProps {
  text: string;
  query: string;
}

function HighlightText({ text, query }: HighlightTextProps) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches the query (case-insensitive)
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return isMatch ? (
          <mark key={index} className="bg-highlight text-highlight-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

// ============================================================================
// Result Item Component
// ============================================================================

interface ResultItemProps {
  result: SearchResult;
  query: string;
  isSelected: boolean;
  onClick: () => void;
}

function ResultItem({ result, query, isSelected, onClick }: ResultItemProps) {
  const colorClass = AVATAR_COLORS[result.avatar?.color || 'default'];

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-fast cursor-pointer',
        isSelected ? 'bg-muted' : 'hover:bg-muted'
      )}
    >
      {result.avatar ? (
        <Avatar className="size-container-sm">
          <AvatarFallback className={cn('text-xs font-semibold', colorClass)}>
            {result.avatar.initials}
          </AvatarFallback>
        </Avatar>
      ) : result.icon ? (
        <div className="size-container-sm bg-muted rounded-lg flex items-center justify-center">
          {result.icon}
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          <HighlightText text={result.title} query={query} />
        </p>
        {result.subtitle && (
          <p className="text-xs text-foreground-secondary truncate">
            <HighlightText text={result.subtitle} query={query} />
          </p>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchInput({
  value: controlledValue,
  placeholder = 'Search...',
  size = 'default',
  showShortcut = false,
  shortcut = '⌘K',
  results,
  isLoading = false,
  onSearch,
  onResultClick,
  onViewAll,
  className,
  autoFocus = false,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Use controlled or uncontrolled value
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Flatten results for keyboard navigation
  const flatResults = React.useMemo(() => {
    if (!results) return [];
    return results.flatMap((group) => group.results);
  }, [results]);

  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onSearch(newValue);
    setSelectedIndex(-1);
    if (newValue.trim()) {
      setIsOpen(true);
    }
  };

  // Clear input
  const handleClear = () => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onSearch('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    onResultClick?.(result);
    setIsOpen(false);
    if (controlledValue === undefined) {
      setInternalValue('');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || flatResults.length === 0) {
      if (e.key === 'ArrowDown' && value.trim()) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && flatResults[selectedIndex]) {
          handleResultSelect(flatResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (): void => {
      setIsOpen(false);
      setSelectedIndex(-1);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const sizeClasses = SIZE_CLASSES[size];
  const hasResults = results?.some((g) => g.results.length > 0);
  const showDropdown = isOpen && (hasResults || isLoading);

  return (
    <div className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
      <Popover open={showDropdown} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            {/* Search Icon */}
            <Search
              className={cn(
                'absolute top-1/2 -translate-y-1/2 text-foreground-tertiary',
                sizeClasses.icon
              )}
              aria-hidden="true"
            />

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls="search-results"
              aria-activedescendant={
                selectedIndex >= 0
                  ? `search-result-${flatResults[selectedIndex]?.id}`
                  : undefined
              }
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (value.trim() && hasResults) {
                  setIsOpen(true);
                }
              }}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className={cn(
                'w-full bg-background border border-border-light rounded-lg',
                'focus:outline-none focus:border-primary focus:ring-focus focus:ring-primary/15',
                'placeholder:text-foreground-tertiary',
                'transition-all duration-fast',
                sizeClasses.input,
                showShortcut && 'pr-16'
              )}
            />

            {/* Clear Button */}
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2',
                  'text-foreground-tertiary hover:text-foreground-secondary',
                  'transition-colors duration-fast cursor-pointer'
                )}
                aria-label="Clear search"
              >
                <X className={sizeClasses.clear} />
              </button>
            )}

            {/* Keyboard Shortcut */}
            {showShortcut && !value && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {shortcut.split('').map((char, i) => (
                  <kbd
                    key={i}
                    className="px-1.5 py-0.5 bg-muted text-foreground-secondary text-xs font-medium rounded border border-border-light"
                  >
                    {char}
                  </kbd>
                ))}
              </div>
            )}
          </div>
        </PopoverTrigger>

        {/* Results Dropdown */}
        <PopoverContent
          id="search-results"
          role="listbox"
          className="w-[var(--radix-popover-trigger-width)] p-0 border-border-light shadow-lg z-dropdown"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-icon-md text-foreground-tertiary animate-spin" />
              </div>
            ) : (
              results?.map((group, groupIndex) => {
                if (group.results.length === 0) return null;

                // Calculate starting index for this group
                let startIndex = 0;
                for (let i = 0; i < groupIndex; i++) {
                  const prevGroup = results[i];
                  if (prevGroup) {
                    startIndex += prevGroup.results.length;
                  }
                }

                return (
                  <div key={group.category}>
                    <div className="p-2 text-2xs uppercase tracking-wider font-semibold text-foreground-tertiary border-b border-border-light">
                      {group.category}
                    </div>
                    {group.results.map((result, resultIndex) => (
                      <ResultItem
                        key={result.id}
                        result={result}
                        query={value}
                        isSelected={selectedIndex === startIndex + resultIndex}
                        onClick={() => handleResultSelect(result)}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* View All Footer */}
          {onViewAll && hasResults && !isLoading && (
            <div className="p-2 border-t border-border-light">
              <button
                type="button"
                onClick={() => {
                  onViewAll();
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-primary font-medium hover:underline cursor-pointer"
              >
                View all results
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ============================================================================
// Keyboard Shortcut Trigger
// ============================================================================

export interface SearchTriggerProps {
  /** Placeholder text */
  placeholder?: string;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Called when trigger is clicked or shortcut is pressed */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A search trigger button that looks like an input
 * Useful for opening a command palette or search modal
 */
export function SearchTrigger({
  placeholder = 'Search...',
  shortcut = '⌘K',
  onClick,
  className,
}: SearchTriggerProps) {
  // Handle keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClick();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2',
        'bg-background border border-border-light rounded-lg',
        'text-sm text-foreground-tertiary',
        'hover:border-border hover:bg-muted',
        'transition-all duration-fast cursor-pointer',
        className
      )}
    >
      <Search className="size-icon-sm" aria-hidden="true" />
      <span className="flex-1 text-left">{placeholder}</span>
      <div className="flex items-center gap-1">
        {shortcut.split('').map((char, i) => (
          <kbd
            key={i}
            className="px-1.5 py-0.5 bg-muted text-foreground-secondary text-xs font-medium rounded border border-border-light"
          >
            {char}
          </kbd>
        ))}
      </div>
    </button>
  );
}
