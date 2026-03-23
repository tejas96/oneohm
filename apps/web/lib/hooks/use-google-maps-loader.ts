'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useState } from 'react';

import { config } from '@/lib/config/config';

/** Loaded Places library namespace */
export interface PlacesNamespace {
  AutocompleteService: new () => google.maps.places.AutocompleteService;
  PlacesService: new (attrContainer: HTMLDivElement) => google.maps.places.PlacesService;
}

interface UseGoogleMapsLoaderReturn {
  isLoaded: boolean;
  error: string | null;
  places: PlacesNamespace | null;
}

let loaderPromise: Promise<PlacesNamespace> | null = null;

function normalizeApiKey(raw: string | undefined): string {
  const key = (raw ?? '').trim();
  if (!key || key === 'YOUR_GOOGLE_KEY') return '';
  return key;
}

function loadPlaces(): Promise<PlacesNamespace> {
  if (loaderPromise) return loaderPromise;

  const apiKey = normalizeApiKey(config.thirdParty.googleMapsApiKey);
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured'));
  }

  // Some versions of @googlemaps/js-api-loader have stricter TS types for setOptions.
  // We still pass apiKey+version at runtime; cast avoids blocking compilation.
  setOptions({ apiKey, version: 'weekly' } as unknown as Parameters<typeof setOptions>[0]);

  loaderPromise = importLibrary('places').then((places) => {
    const lib = places as unknown as PlacesNamespace;
    return lib;
  });

  return loaderPromise;
}

/**
 * Hook to load Google Maps Places library client-side.
 * Uses singleton pattern to prevent multiple script loads.
 * Returns places namespace when ready for AutocompleteService and PlacesService.
 */
export function useGoogleMapsLoader(): UseGoogleMapsLoaderReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlacesNamespace | null>(null);

  useEffect(() => {
    const apiKey = normalizeApiKey(config.thirdParty.googleMapsApiKey);
    if (!apiKey) {
      setError('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured');
      return;
    }

    loadPlaces()
      .then((p) => {
        setPlaces(p);
        setIsLoaded(true);
        setError(null);
      })
      .catch((err) => {
        // Allow retry after fixing env/key issues
        loaderPromise = null;
        setError(err?.message ?? 'Failed to load Google Maps');
        setPlaces(null);
        setIsLoaded(false);
      });
  }, []);

  return { isLoaded, error, places };
}
