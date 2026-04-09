import { useEffect, useState, useCallback } from 'react';

interface UseStatesOptions {
  enabled?: boolean;
}

/**
 * Hook for fetching Indian states from backend API
 * Caches data in component state to avoid refetches
 * Falls back to hardcoded states if API fails
 */
export function useIndianStates(options: UseStatesOptions = {}) {
  const { enabled = true } = options;

  const [states, setStates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStates = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/states', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch states: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        setStates(data.data);
      } else {
        throw new Error('Invalid states data format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      // Log only in development, silent fallback in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('States API fallback:', errorMessage);
      }
      setError(null); // Don't show error to user - fallback will work

      // Fallback: Use hardcoded states if API fails
      setStates([
        'Andhra Pradesh',
        'Arunachal Pradesh',
        'Assam',
        'Bihar',
        'Chhattisgarh',
        'Goa',
        'Gujarat',
        'Haryana',
        'Himachal Pradesh',
        'Jharkhand',
        'Karnataka',
        'Kerala',
        'Madhya Pradesh',
        'Maharashtra',
        'Manipur',
        'Meghalaya',
        'Mizoram',
        'Nagaland',
        'Odisha',
        'Punjab',
        'Rajasthan',
        'Sikkim',
        'Tamil Nadu',
        'Telangana',
        'Tripura',
        'Uttar Pradesh',
        'Uttarakhand',
        'West Bengal',
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Fetch states on mount
  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  return {
    states,
    isLoading,
    error,
    refetch: fetchStates,
  };
}
