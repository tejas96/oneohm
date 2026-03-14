/**
 * Location Service
 *
 * Calls Google Places API for address autocomplete and place details.
 * Uses in-memory cache to reduce API quota usage.
 *
 * @module modules/location/services
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import type { Configuration } from '../../../config/config.interface';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

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

// Simple in-memory cache to reduce Google API quota usage
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService<Configuration, true>) {
    this.apiKey = this.configService.get('thirdParty.googleMapsApiKey', { infer: true }) ?? '';
  }

  async autocomplete(input: string): Promise<PlaceSuggestion[]> {
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY not configured');
      return [];
    }

    const cacheKey = `ac:${input.toLowerCase()}`;
    const cached = getCached<PlaceSuggestion[]>(cacheKey);
    if (cached) return cached;

    const { data } = await axios.get(`${PLACES_BASE}/autocomplete/json`, {
      params: {
        input,
        key: this.apiKey,
        components: 'country:in', // restrict to India
        language: 'en',
        types: 'geocode',
      },
    });

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      this.logger.error(`Places autocomplete error: ${data.status} — ${data.error_message ?? ''}`);
      return [];
    }

    const suggestions: PlaceSuggestion[] = (data.predictions ?? []).map(
      (p: {
        place_id: string;
        description: string;
        structured_formatting: { main_text: string; secondary_text: string };
      }) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text ?? p.description,
        secondaryText: p.structured_formatting?.secondary_text ?? '',
      }),
    );

    setCache(cacheKey, suggestions);
    return suggestions;
  }

  async details(placeId: string): Promise<PlaceDetails> {
    const cacheKey = `det:${placeId}`;
    const cached = getCached<PlaceDetails>(cacheKey);
    if (cached) return cached;

    const { data } = await axios.get(`${PLACES_BASE}/details/json`, {
      params: {
        place_id: placeId,
        key: this.apiKey,
        fields: 'address_components,formatted_address,geometry',
        language: 'en',
      },
    });

    if (data.status !== 'OK') {
      this.logger.error(`Places details error: ${data.status} — ${data.error_message ?? ''}`);
      return { address: '', city: '', state: '', pincode: '', country: 'India', lat: null, lng: null };
    }

    const components: Array<{ long_name: string; short_name: string; types: string[] }> =
      data.result?.address_components ?? [];

    const get = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name ?? '';

    const streetNumber = get('street_number');
    const route = get('route');
    const sublocality = get('sublocality_level_1') || get('sublocality');
    const address = [streetNumber, route, sublocality].filter(Boolean).join(', ')
      || data.result?.formatted_address?.split(',')[0]
      || '';

    // City: locality first, then district (strip " District"/" Urban" suffix), then parse from formatted_address
    let city =
      get('locality') ||
      get('administrative_area_level_2') ||
      get('administrative_area_level_3');
    if (city) {
      city = city.replace(/\s+(District|Urban|Rural)$/i, '').trim();
    }
    if (!city && data.result?.formatted_address) {
      const parts = data.result.formatted_address.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) city = parts[1];
    }

    const state = get('administrative_area_level_1');
    const pincode = get('postal_code');
    const country = get('country') || 'India';
    const lat: number | null = data.result?.geometry?.location?.lat ?? null;
    const lng: number | null = data.result?.geometry?.location?.lng ?? null;

    const result: PlaceDetails = { address, city, state, pincode, country, lat, lng };
    setCache(cacheKey, result);
    return result;
  }
}
