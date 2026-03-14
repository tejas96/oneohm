'use client';

import { Loader2, MapPin, X } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent } from 'react';

import {
  useAddressAutocomplete,
  type PlaceDetails,
  type PlaceSuggestion,
} from '../hooks';

import { Input, Label } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (details: PlaceDetails) => void;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  error,
  errorMessage,
  disabled,
}: AddressAutocompleteProps): React.JSX.Element {
  const { suggestions, isLoading, isOpen, selectPlace, close } =
    useAddressAutocomplete(value);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    activeIndexRef.current = -1;
  };

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    onChange(suggestion.mainText);
    close();
    const details = await selectPlace(suggestion.placeId);
    if (details) {
      onPlaceSelect({ ...details, address: suggestion.mainText });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndexRef.current = Math.min(
        activeIndexRef.current + 1,
        suggestions.length - 1,
      );
      const items = containerRef.current?.querySelectorAll('[data-suggestion]');
      (items?.[activeIndexRef.current] as HTMLElement)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0);
      const items = containerRef.current?.querySelectorAll('[data-suggestion]');
      (items?.[activeIndexRef.current] as HTMLElement)?.focus();
    } else if (e.key === 'Escape') {
      close();
      inputRef.current?.focus();
    }
  };

  const handleItemKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    suggestion: PlaceSuggestion,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void handleSelect(suggestion);
    } else if (e.key === 'Escape') {
      close();
      inputRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndexRef.current = Math.min(
        activeIndexRef.current + 1,
        suggestions.length - 1,
      );
      const items = containerRef.current?.querySelectorAll('[data-suggestion]');
      (items?.[activeIndexRef.current] as HTMLElement)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0);
      const items = containerRef.current?.querySelectorAll('[data-suggestion]');
      (items?.[activeIndexRef.current] as HTMLElement)?.focus();
    }
  };

  const handleClear = () => {
    onChange('');
    close();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor="address">Street Address</Label>
      <div className="relative mt-2">
        <Input
          ref={inputRef}
          id="address"
          placeholder="Start typing an address..."
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          error={error}
          errorMessage={errorMessage}
          autoComplete="off"
          prefix={<MapPin className="size-4 text-foreground-secondary" />}
          suffix={
            isLoading ? (
              <Loader2 className="size-4 animate-spin text-foreground-secondary" />
            ) : value ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-foreground-secondary hover:text-foreground transition-colors"
                aria-label="Clear address"
              >
                <X className="size-4" />
              </button>
            ) : undefined
          }
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-sm overflow-hidden">
          <ul
            role="listbox"
            aria-label="Address suggestions"
            className="py-1 max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId} role="option">
                <button
                  type="button"
                  data-suggestion
                  className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
                  onClick={() => void handleSelect(suggestion)}
                  onKeyDown={(e) => handleItemKeyDown(e, suggestion)}
                  tabIndex={0}
                  aria-selected={activeIndexRef.current === index}
                >
                  <MapPin className="size-4 text-foreground-secondary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {suggestion.mainText}
                    </p>
                    {suggestion.secondaryText && (
                      <p className="text-xs text-foreground-secondary truncate">
                        {suggestion.secondaryText}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-1.5 border-t border-border bg-muted/30">
            <p className="text-xs text-foreground-secondary">
              Powered by Google Maps
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
