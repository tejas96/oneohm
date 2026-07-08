'use client';

import type { CreatePropertyFormData, EditPropertyFormData } from './schemas/property.schema';

import type { CustomerPropertyResponse } from '@/components/features/customers/hooks';

type PropertyFormValues = CreatePropertyFormData | EditPropertyFormData;

/**
 * Maps form latitude/longitude fields to API gpsCoordinates payload.
 */
export function buildPropertyApiPayload<T extends PropertyFormValues>(
  data: T,
): Omit<T, 'latitude' | 'longitude'> & {
  gpsCoordinates?: { latitude: number; longitude: number; accuracy?: number; altitude?: number };
} {
  const { latitude, longitude, gpsCoordinates, ...rest } = data as T & {
    latitude?: number;
    longitude?: number;
    gpsCoordinates?: { latitude: number; longitude: number };
  };

  const coords =
    gpsCoordinates ??
    (latitude != null &&
    longitude != null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude))
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : undefined);

  const payload = {
    ...rest,
    ...(coords ? { gpsCoordinates: coords } : {}),
  };

  return payload as Omit<T, 'latitude' | 'longitude'> & {
    gpsCoordinates?: { latitude: number; longitude: number; accuracy?: number; altitude?: number };
  };
}

export function getPropertyDisplayName(property: Partial<CustomerPropertyResponse>): string {
  if (property.propertyName) return property.propertyName;
  const parts = [property.address, property.city, property.state].filter(Boolean);
  return parts.join(', ') || 'Unnamed Property';
}
