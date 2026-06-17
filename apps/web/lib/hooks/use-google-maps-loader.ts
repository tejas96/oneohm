'use client';

import * as React from 'react';
import { config } from '@/lib/config/config';

let scriptLoadingPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise((resolve, reject) => {
      const apiKey = config.thirdParty.googleMapsApiKey;
      if (!apiKey) {
        reject(
          new Error(
            'Google Maps API key is missing. Make sure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is defined in your environment.',
          ),
        );
        return;
      }

      // Check if script is already present on the page (e.g. from another script tag or previous load)
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        // If script element exists but window.google is not loaded yet, wait for it
        const checkInterval = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Timeout after 10s to prevent hanging
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Google Maps script loading timed out.'));
        }, 10000);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Double check if google.maps is loaded
        if (window.google?.maps) {
          resolve();
        } else {
          reject(new Error('Google Maps object is missing after script load.'));
        }
      };
      script.onerror = (err) => {
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  return scriptLoadingPromise;
}

export function useGoogleMapsLoader() {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    loadGoogleMapsScript()
      .then(() => {
        if (active) {
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load Google Maps script:', err);
          setError(err instanceof Error ? err.message : 'Failed to load map services');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { loaded, error };
}
