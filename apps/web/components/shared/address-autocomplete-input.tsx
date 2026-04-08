'use client';

/**
 * Reusable Address Autocomplete Input Component
 * Integrates with React Hook Form and provides Google Places suggestions
 * Minimal UI changes - only adds autocomplete dropdown to address field
 */

import { Loader2, AlertCircle } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { Textarea } from '@/components/ui';
import { useGooglePlacesAutocomplete, type AutocompleteOption } from '@/lib/hooks/useGooglePlacesAutocomplete';
import { type AddressComponents } from '@/lib/utils/google-maps-geocoding';

interface AddressAutocompleteInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  placeholder?: string;
  onAddressSelected?: (addressComponents: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }) => void;
  disabled?: boolean;
  apiKey?: string;
}

export function AddressAutocompleteInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  placeholder = 'Enter address and select from suggestions',
  onAddressSelected,
  disabled = false,
  apiKey,
}: AddressAutocompleteInputProps<TFieldValues, TName>): React.ReactElement {
  const { field, fieldState } = useController({
    control,
    name,
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(field.value || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const {
    predictions,
    isLoading,
    error,
    getPredictions,
    selectPlace,
    clearPredictions,
  } = useGooglePlacesAutocomplete({
    apiKey,
    onPlaceSelected: ((components) => {
      // Update form fields
      field.onChange(components.address);
      setInputValue(components.address);
      setShowDropdown(false);

      // Call parent callback for other field updates
      onAddressSelected?.(components);
    }) as ((components: AddressComponents) => void),
    onError: ((err: Error) => {
      console.error('Google Places Error:', err);
    }) as ((error: Error) => void),
  });

  // Sync local state with field value on mount
  useEffect(() => {
    setInputValue(field.value || '');
  }, [field.value]);

  // Handle prediction selection (declared first, used by other handlers)
  const handleSelectPrediction = useCallback(
    async (option: AutocompleteOption) => {
      setInputValue(option.description);
      field.onChange(option.description);
      setShowDropdown(false);
      setSelectedIndex(-1);

      // Fetch place details
      await selectPlace(option.placeId);
    },
    [selectPlace, field],
  );

  // Handle input change with debounce
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setInputValue(value);
      field.onChange(value);
      setSelectedIndex(-1);

      // Clear debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Fetch predictions with debounce
      if (value.length > 2) {
        setShowDropdown(true);
        debounceRef.current = setTimeout(() => {
          void getPredictions(value);
        }, 300);
      } else {
        clearPredictions();
        setShowDropdown(false);
      }
    },
    [field, getPredictions, clearPredictions],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (!showDropdown || predictions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < predictions.length - 1 ? prev + 1 : prev,
          );
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (selectedIndex >= 0 && predictions[selectedIndex]) {
            void handleSelectPrediction(predictions[selectedIndex]);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setShowDropdown(false);
          break;
        }
        default: {
          // Handle other keys silently
          break;
        }
      }
    },
    [showDropdown, predictions, selectedIndex, handleSelectPrediction],
  );

  // Close dropdown on outside click
  useEffect((): (() => void) | undefined => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    
    return undefined;
  }, [showDropdown]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.length > 2 && predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${fieldState.error ? 'border-red-500' : ''} min-h-[80px]`}
        />
        
        {isLoading && (
          <div className="absolute right-3 top-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropdown with suggestions */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 border border-input bg-background rounded-md shadow-md max-h-60 overflow-y-auto"
        >
          {predictions.map((option, index) => (
            <button
              key={option.placeId}
              type="button"
              onClick={() => void handleSelectPrediction(option)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                index === selectedIndex ? 'bg-accent' : ''
              }`}
            >
              <div className="font-medium">{option.mainText}</div>
              {option.secondaryText && (
                <div className="text-xs text-muted-foreground">
                  {option.secondaryText}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {showDropdown && predictions.length === 0 && !isLoading && inputValue.length > 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-input bg-background rounded-md shadow-md p-3 text-sm text-muted-foreground">
          No results found. Try a different search.
        </div>
      )}

      {/* Form validation error */}
      {fieldState.error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
