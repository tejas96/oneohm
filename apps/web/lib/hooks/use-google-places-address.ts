'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeIndianStateLabel } from '@oneohm-epc/shared/constants';

import { config } from '@/lib/config/config';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface GoogleAddressPrediction {
  description: string;
  place_id: string;
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GooglePlaceDetails {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
}

interface GooglePlacesAutocompleteService {
  getPlacePredictions: (
    request: {
      input: string;
      componentRestrictions?: { country: string };
      types?: string[];
      sessionToken?: unknown;
    },
    callback: (predictions: GoogleAddressPrediction[] | null, status: string) => void,
  ) => void;
}

interface GooglePlacesService {
  getDetails: (
    request: { placeId: string; fields: string[]; sessionToken?: unknown },
    callback: (place: GooglePlaceDetails | null, status: string) => void,
  ) => void;
}

interface GoogleMapsPlacesApi {
  maps?: {
    places?: {
      AutocompleteService?: new () => GooglePlacesAutocompleteService;
      PlacesService?: new (element: Element) => GooglePlacesService;
      AutocompleteSessionToken?: new () => unknown;
      PlacesServiceStatus?: {
        OK?: string;
        ZERO_RESULTS?: string;
      };
    };
  };
}

export interface AddressSuggestionOption {
  [key: string]: unknown;
  label?: string;
  value?: string;
  disabled?: boolean;
  placeId: string;
}

export interface ParsedAddressDetails {
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-places-script';
const INDIA_COUNTRY_CODE = 'in';

function getGoogleMapsApi(): GoogleMapsPlacesApi | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & { google?: GoogleMapsPlacesApi };
  return win.google ?? null;
}

function parseAddressComponents(place: GooglePlaceDetails): ParsedAddressDetails {
  const components = place.address_components ?? [];

  const getByType = (type: string): GoogleAddressComponent | undefined =>
    components.find((component) => component.types.includes(type));

  const cityComponent =
    getByType('locality') ??
    getByType('postal_town') ??
    getByType('administrative_area_level_2') ??
    getByType('sublocality_level_1');

  const stateComponent = getByType('administrative_area_level_1');
  const pincodeComponent = getByType('postal_code');
  const countryComponent = getByType('country');

  const pincode = (pincodeComponent?.long_name ?? '').replace(/\D/g, '').slice(0, 6);

  return {
    address: place.formatted_address ?? '',
    city: cityComponent?.long_name ?? '',
    state: normalizeIndianStateLabel(stateComponent?.long_name),
    pincode,
    country: countryComponent?.long_name ?? 'India',
  };
}

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as
    | HTMLScriptElement
    | null;

  if (getGoogleMapsApi()?.maps?.places) return Promise.resolve();

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load maps')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load maps'));
    document.head.appendChild(script);
  });
}

export function useGooglePlacesAddress(countryCode: string = INDIA_COUNTRY_CODE): {
  isReady: boolean;
  isLoadingSuggestions: boolean;
  errorMessage: string | null;
  suggestions: AddressSuggestionOption[];
  query: string;
  setQuery: (value: string) => void;
  clearSuggestions: () => void;
  fetchAddressDetails: (placeId: string) => Promise<ParsedAddressDetails | null>;
} {
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestionOption[]>([]);
  const [query, setQuery] = useState('');

  const debouncedQuery = useDebounce(query.trim(), 350);

  const autocompleteServiceRef = useRef<GooglePlacesAutocompleteService | null>(null);
  const placesServiceRef = useRef<GooglePlacesService | null>(null);
  const sessionTokenRef = useRef<unknown>(null);

  const mapsApiKey = config.thirdParty.googleMapsApiKey;

  const createSessionToken = useCallback(() => {
    const mapsApi = getGoogleMapsApi();
    const ctor = mapsApi?.maps?.places?.AutocompleteSessionToken;
    if (!ctor) return;
    sessionTokenRef.current = new ctor();
  }, []);

  useEffect(() => {
    if (!mapsApiKey) {
      setErrorMessage('Google Maps key is not configured. Address suggestions are unavailable.');
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        await loadGooglePlacesScript(mapsApiKey);
        if (isCancelled) return;

        const mapsApi = getGoogleMapsApi();
        const placesApi = mapsApi?.maps?.places;
        if (!placesApi?.AutocompleteService || !placesApi?.PlacesService) {
          throw new Error('Google Places API unavailable');
        }

        autocompleteServiceRef.current = new placesApi.AutocompleteService();

        const serviceContainer = document.createElement('div');
        placesServiceRef.current = new placesApi.PlacesService(serviceContainer);
        createSessionToken();

        setErrorMessage(null);
        setIsReady(true);
      } catch {
        if (!isCancelled) {
          setErrorMessage('Unable to load Google Maps suggestions. You can enter address manually.');
          setIsReady(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [createSessionToken, mapsApiKey]);

  useEffect(() => {
    if (!isReady || !autocompleteServiceRef.current) return;
    if (!debouncedQuery) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: debouncedQuery,
        componentRestrictions: { country: countryCode },
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (predictions, status) => {
        const mapsApi = getGoogleMapsApi();
        const statusOk = mapsApi?.maps?.places?.PlacesServiceStatus?.OK;
        const statusNoResults = mapsApi?.maps?.places?.PlacesServiceStatus?.ZERO_RESULTS;

        if (status === statusOk && predictions) {
          const nextSuggestions = predictions.map((prediction) => ({
            label: prediction.description,
            value: prediction.description,
            placeId: prediction.place_id,
          }));
          setSuggestions(nextSuggestions);
        } else if (status === statusNoResults) {
          setSuggestions([]);
        } else {
          setSuggestions([]);
        }

        setIsLoadingSuggestions(false);
      },
    );
  }, [countryCode, debouncedQuery, isReady]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const fetchAddressDetails = useCallback(
    async (placeId: string): Promise<ParsedAddressDetails | null> => {
      if (!placesServiceRef.current) return null;

      return new Promise((resolve) => {
        placesServiceRef.current?.getDetails(
          {
            placeId,
            fields: ['formatted_address', 'address_components'],
            sessionToken: sessionTokenRef.current ?? undefined,
          },
          (place, status) => {
            const mapsApi = getGoogleMapsApi();
            const statusOk = mapsApi?.maps?.places?.PlacesServiceStatus?.OK;

            if (status === statusOk && place) {
              resolve(parseAddressComponents(place));
              createSessionToken();
              return;
            }

            resolve(null);
          },
        );
      });
    },
    [createSessionToken],
  );

  return useMemo(
    () => ({
      isReady,
      isLoadingSuggestions,
      errorMessage,
      suggestions,
      query,
      setQuery,
      clearSuggestions,
      fetchAddressDetails,
    }),
    [clearSuggestions, errorMessage, fetchAddressDetails, isLoadingSuggestions, isReady, query, suggestions],
  );
}
