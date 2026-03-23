'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDebounce, useGoogleMapsLoader } from '@/lib/hooks';
import { extractAddressComponents, type PlaceDetails } from '@/lib/utils/address-utils';

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export type { PlaceDetails };

interface UseAddressAutocompleteReturn {
  suggestions: PlaceSuggestion[];
  isLoading: boolean;
  isOpen: boolean;
  selectPlace: (placeId: string) => Promise<PlaceDetails | null>;
  close: () => void;
  error: string | null;
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

export function useAddressAutocomplete(
  input: string,
): UseAddressAutocompleteReturn {
  const { places, isLoaded, error: loaderError } = useGoogleMapsLoader();
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const placesServiceContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLoaded || !places || debouncedInput.length < MIN_CHARS) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const autocompleteService = new places.AutocompleteService();
    autocompleteService.getPlacePredictions(
      {
        input: debouncedInput,
        componentRestrictions: { country: 'in' },
      },
      (predictions, status) => {
        if (cancelled) return;
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
          setSuggestions([]);
          setIsOpen(false);
          setIsLoading(false);
          return;
        }
        const mapped: PlaceSuggestion[] = predictions.map((p) => ({
          placeId: p.place_id ?? '',
          description: p.description ?? '',
          mainText: p.structured_formatting?.main_text ?? '',
          secondaryText: p.structured_formatting?.secondary_text ?? '',
        }));
        setSuggestions(mapped);
        setIsOpen(mapped.length > 0);
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [debouncedInput, isLoaded, places]);

  const selectPlace = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      if (!places) return null;

      const container =
        placesServiceContainerRef.current ?? document.createElement('div');
      if (!placesServiceContainerRef.current) {
        placesServiceContainerRef.current = container;
        container.style.display = 'none';
        document.body.appendChild(container);
      }

      const service = new places.PlacesService(container);

      return new Promise((resolve) => {
        service.getDetails(
          {
            placeId,
            fields: [
              'address_components',
              'formatted_address',
              'geometry',
            ],
          },
          (place, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
              resolve(null);
              return;
            }
            resolve(extractAddressComponents(place));
          },
        );
      });
    },
    [places],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    isOpen,
    selectPlace,
    close,
    error: loaderError,
  };
}
