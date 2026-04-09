'use client';

/**
 * Custom hook for Google Places Autocomplete with address auto-filling
 * Handles autocomplete predictions, filtering to India, and geocoding
 */

import { useCallback, useState, useRef, useEffect } from 'react';

import {
  extractAddressComponentsFromPlace,
  isPlaceInIndia,
  sanitizeAddressInput,
  generateMissingFieldsMessage,
  type AddressComponents,
} from '../utils/google-maps-geocoding';

export interface AutocompleteOption {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
}

interface UseGooglePlacesAutocompleteOptions {
  apiKey?: string;
  onPlaceSelected?: (components: AddressComponents) => void;
  onMissingFieldsFound?: (missingFields: (keyof AddressComponents)[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for Google Places Autocomplete
 * Provides predictions, place selection, and address component extraction
 */
export function useGooglePlacesAutocomplete({
  apiKey,
  onPlaceSelected,
  onMissingFieldsFound,
  onError,
}: UseGooglePlacesAutocompleteOptions): {
  predictions: AutocompleteOption[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  missingFields: (keyof AddressComponents)[];
  getPredictions: (input: string) => Promise<void>;
  selectPlace: (placeId: string) => Promise<void>;
  clearPredictions: () => void;
  clearError: () => void;
} {
  const [predictions, setPredictions] = useState<AutocompleteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<(keyof AddressComponents)[]>([]);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Initialize Google Maps services
  useEffect((): (() => void) => {
    let isMounted = true;

    const initGoogleMaps = async (): Promise<void> => {
      if (!apiKey) {
        const err = 'Google Maps API key not provided';
        setError(err);
        onError?.(new Error(err));
        return;
      }

      try {
        // Check if Google Maps is already loaded
        if (window.google?.maps?.places?.AutocompleteService) {
          if (isMounted) {
            autocompleteServiceRef.current =
              new window.google.maps.places.AutocompleteService();
            
            // Create a properly positioned dummy map for PlacesService
            const dummyDiv = document.createElement('div');
            dummyDiv.style.position = 'fixed';
            dummyDiv.style.top = '-1000px';
            dummyDiv.style.left = '-1000px';
            dummyDiv.style.width = '1px';
            dummyDiv.style.height = '1px';
            document.body.appendChild(dummyDiv);

            mapRef.current = new window.google.maps.Map(dummyDiv, {
              center: { lat: 20.5937, lng: 78.9629 }, // Center of India
              zoom: 4,
            });
            
            placesServiceRef.current = new window.google.maps.places.PlacesService(
              mapRef.current,
            );
            
            setIsInitialized(true);
          }
          return;
        }

        // Load using script tag approach
        const loadGoogleMaps = (): Promise<void> => {
          return new Promise((resolve, reject) => {
            // Check if already loading or loaded
            if (window.google?.maps?.places?.AutocompleteService) {
              return resolve();
            }

            // Prevent duplicate scripts
            const existingScript = document.querySelector(
              'script[src*="maps.googleapis.com"]'
            );
            if (existingScript) {
              // Wait a bit for the existing script to load
              const checkInterval = setInterval(() => {
                if (window.google?.maps?.places?.AutocompleteService) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 100);
              setTimeout(() => clearInterval(checkInterval), 5000);
              return;
            }

            const script = document.createElement('script');
            script.async = true;
            script.defer = true;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=quarterly`;

            script.onload = () => {
              // Add small delay to ensure full initialization
              setTimeout(() => {
                if (window.google?.maps?.places?.AutocompleteService) {
                  resolve();
                } else {
                  reject(new Error('Failed to load Google Maps API'));
                }
              }, 100);
            };

            script.onerror = () => {
              reject(new Error('Failed to load Google Maps script'));
            };

            document.head.appendChild(script);
          });
        };

        await loadGoogleMaps();

        if (isMounted && window.google?.maps?.places?.AutocompleteService) {
          autocompleteServiceRef.current =
            new window.google.maps.places.AutocompleteService();
          
          // Create properly positioned dummy map
          const dummyDiv = document.createElement('div');
          dummyDiv.style.position = 'fixed';
          dummyDiv.style.top = '-1000px';
          dummyDiv.style.left = '-1000px';
          dummyDiv.style.width = '1px';
          dummyDiv.style.height = '1px';
          document.body.appendChild(dummyDiv);

          mapRef.current = new window.google.maps.Map(dummyDiv, {
            center: { lat: 20.5937, lng: 78.9629 }, // Center of India
            zoom: 4,
          });
          
          placesServiceRef.current = new window.google.maps.places.PlacesService(
            mapRef.current,
          );
          
          setIsInitialized(true);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (isMounted) {
          setError(error.message);
          onError?.(error);
        }
      }
    };

    void initGoogleMaps();

    return () => {
      isMounted = false;
      // Cleanup: remove the dummy map if created
      if (mapRef.current) {
        try {
          mapRef.current = null;
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [apiKey, onError]);

  /**
   * Get autocomplete predictions for the given input
   */
  const getPredictions = useCallback(
    async (input: string) => {
      if (!input.trim()) {
        setPredictions([]);
        return;
      }

      if (!autocompleteServiceRef.current) {
        setError('Autocomplete service not initialized. Please wait a moment and try again.');
        setPredictions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const sanitizedInput = sanitizeAddressInput(input);

        const response =
          await autocompleteServiceRef.current.getPlacePredictions({
            input: sanitizedInput,
            componentRestrictions: { country: 'in' }, // Restrict to India
            types: ['geocode','establishment'], // Broader types for better results
          });

        if (response?.predictions && Array.isArray(response.predictions)) {
          const options: AutocompleteOption[] = response.predictions.map(
            (prediction) => ({
              placeId: prediction.place_id,
              description: prediction.description,
              mainText: prediction.structured_formatting?.main_text,
              secondaryText: prediction.structured_formatting?.secondary_text,
            }),
          );

          setPredictions(options);
        } else {
          setPredictions([]);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        onError?.(error);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [onError],
  );

  /**
   * Get place details and extract address components
   */
  const selectPlace = useCallback(
    async (placeId: string) => {
      if (!placesServiceRef.current || !mapRef.current) {
        const err = new Error('Places Service not initialized. Please wait a moment and try again.');
        setError(err.message);
        onError?.(err);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const place = await new Promise<google.maps.places.PlaceResult | null>(
          (resolve, reject) => {
            try {
              if (!placesServiceRef.current) {
                return reject(new Error('Places Service no longer available'));
              }

              placesServiceRef.current.getDetails(
                {
                  placeId,
                  fields: [
                    'formatted_address',
                    'address_components',
                    'geometry',
                    'name',
                  ],
                },
                (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
                  if (
                    status === google.maps.places.PlacesServiceStatus.OK &&
                    place
                  ) {
                    resolve(place);
                  } else {
                    // Handle status codes
                    const statusMessage =
                      status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
                        ? 'Place not found'
                        : status === google.maps.places.PlacesServiceStatus.UNKNOWN_ERROR
                          ? 'An unknown error occurred'
                          : status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST
                            ? 'Invalid request'
                            : status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT
                              ? 'Rate limit exceeded. Please try again later.'
                              : status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED
                                ? 'Request denied. Check your API key.'
                                : `Places Service Error: ${status}`;

                    reject(new Error(statusMessage));
                  }
                },
              );
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              reject(error);
            }
          },
        );

        if (!place) {
          throw new Error('Failed to fetch place details');
        }

        // Verify the place is in India
        if (!isPlaceInIndia(place)) {
          const err = new Error('Please select a location within India');
          setError(err.message);
          onError?.(err);
          return;
        }

        // Extract address components (now handles partial data)
        const extractionResult = extractAddressComponentsFromPlace(place);
        const { components, missingFields: missingFieldsFromResult, hasPartialData } = extractionResult;

        // Check if we have any usable data
        if (!hasPartialData) {
          const err = new Error('Could not extract address components from this location. Please try another address.');
          setError(err.message);
          onError?.(err);
          return;
        }

        // Auto-fill with whatever we have
        setPredictions([]);

        if (missingFieldsFromResult.length > 0) {
          // Store missing fields in state for component access
          setMissingFields(missingFieldsFromResult);
          // Notify parent about missing fields
          onMissingFieldsFound?.(missingFieldsFromResult);
          // Show informational message about missing fields to user
          const message = generateMissingFieldsMessage(missingFieldsFromResult);
          setError(message); // Display message to user (will be shown in blue by component)
        } else {
          // Clear error state only if all fields are present
          setError(null);
          setMissingFields([]);
        }

        // Call callback with partial components - form will auto-fill what we have
        onPlaceSelected?.(components as AddressComponents);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [onError, onPlaceSelected],
  );

  /**
   * Clear predictions and error
   */
  const clearPredictions = useCallback(() => {
    setPredictions([]);
    setError(null);
  }, []);

  /**
   * Clear error message (called when user starts typing)
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    predictions,
    isLoading,
    isInitialized,
    error,
    missingFields,
    getPredictions,
    selectPlace,
    clearPredictions,
    clearError,
  };
}
