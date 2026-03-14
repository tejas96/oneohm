'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useDebounce } from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

interface UseAddressAutocompleteReturn {
  suggestions: PlaceSuggestion[];
  isLoading: boolean;
  isOpen: boolean;
  selectPlace: (placeId: string) => Promise<PlaceDetails | null>;
  close: () => void;
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

export function useAddressAutocomplete(
  input: string,
): UseAddressAutocompleteReturn {
  const { user } = useAuth();
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const headers = { 'X-Organization-Id': user?.organizationId };

  useEffect(() => {
    if (debouncedInput.length < MIN_CHARS) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void apiClient
      .get<PlaceSuggestion[]>(
        `/location/autocomplete?input=${encodeURIComponent(debouncedInput)}`,
        { headers },
      )
      .then(({ data }) => {
        if (!cancelled) {
          setSuggestions(data);
          setIsOpen(data.length > 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setIsOpen(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedInput, user?.organizationId]);

  const selectPlace = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      try {
        const { data } = await apiClient.get<PlaceDetails>(
          `/location/details?placeId=${encodeURIComponent(placeId)}`,
          { headers },
        );
        return data;
      } catch {
        return null;
      }
    },
    [user?.organizationId],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setSuggestions([]);
  }, []);

  return { suggestions, isLoading, isOpen, selectPlace, close };
}
