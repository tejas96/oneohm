'use client';

import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { Box } from '@mui/material';
import { Map, Marker, useMap } from '@vis.gl/react-google-maps';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

interface AddressMapViewerProps {
  latitude: number | string | undefined;
  longitude: number | string | undefined;
  onMarkerDragEnd: (lat: number, lng: number) => void;
}

/**
 * Component to handle map center synchronization
 */
function MapCenterController({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}): null {
  const map = useMap();
  const prevCoordsRef = React.useRef<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    if (!map) return;

    const latVal = latitude;
    const lngVal = longitude;

    // Only update map center if it's the first load or coordinates changed significantly
    const prev = prevCoordsRef.current;
    const distanceThreshold = 0.0001; // roughly 10 meters

    if (
      !prev ||
      Math.abs(prev.lat - latVal) > distanceThreshold ||
      Math.abs(prev.lng - lngVal) > distanceThreshold
    ) {
      map.setCenter({ lat: latVal, lng: lngVal });
      prevCoordsRef.current = { lat: latVal, lng: lngVal };
    }
  }, [map, latitude, longitude]);

  return null;
}

/**
 * AddressMapViewer Component
 * Renders the interactive Google Map with a draggable Marker
 */
export function AddressMapViewer({
  latitude,
  longitude,
  onMarkerDragEnd,
}: AddressMapViewerProps): React.JSX.Element {
  const latVal = parseFloat(latitude as string) || 12.9716;
  const lngVal = parseFloat(longitude as string) || 77.5946;
  const initialPosition = { lat: latVal, lng: lngVal };

  const handleMarkerDragEnd = React.useCallback(
    (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng;
      if (latLng) {
        onMarkerDragEnd(latLng.lat(), latLng.lng());
      }
    },
    [onMarkerDragEnd],
  );

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-1.5 text-xs text-foreground-secondary font-medium">
        <MapOutlinedIcon sx={{ fontSize: 14 }} />
        <MUITypography variant="finePrint">
          Pinpoint Accurate Location (Drag marker to adjust)
        </MUITypography>
      </div>

      <div
        className="w-full h-64 rounded-lg shadow-e2 overflow-hidden shadow-sm bg-background-elevated"
        style={{ minHeight: '256px' }}
      >
        <Map
          defaultCenter={initialPosition}
          defaultZoom={16}
          mapTypeId="hybrid"
          mapTypeControl={true}
          streetViewControl={false}
          fullscreenControl={true}
          zoomControl={true}
          className="w-full h-full"
        >
          <MapCenterController latitude={latVal} longitude={lngVal} />
          <Marker
            position={initialPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
            title="Drag to adjust location"
          />
        </Map>
      </div>

      {latitude && longitude && (
        <Box className="flex gap-4 justify-end text-[10px] text-foreground-tertiary font-mono">
          <span>Lat: {latVal.toFixed(6)}</span>
          <span>Lng: {lngVal.toFixed(6)}</span>
        </Box>
      )}
    </div>
  );
}
