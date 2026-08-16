'use client';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DirectionsOutlinedIcon from '@mui/icons-material/DirectionsOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { Box, Button, Card, CardContent, Stack } from '@mui/material';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { type JSX, useCallback } from 'react';

import { MUITypography, showToast } from '@/components/ui';
import { config } from '@/lib/config/config';
import { radius } from '@/lib/theme/tokens';
import { useConfig } from '@/providers/config-provider';

export interface ServiceTicketLocationCardProps {
  propertyAddress: string | null;
  propertyCoordinates: { latitude: number; longitude: number } | null;
}

function buildDirectionsUrl(
  coordinates: { latitude: number; longitude: number } | null,
  address: string | null,
): string | null {
  if (coordinates) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return null;
}

function LocationCardContent({
  propertyAddress,
  propertyCoordinates,
  mapsApiKey,
}: ServiceTicketLocationCardProps & { mapsApiKey: string }): JSX.Element {
  const directionsUrl = buildDirectionsUrl(propertyCoordinates, propertyAddress);
  const hasMap = Boolean(mapsApiKey && propertyCoordinates);

  const handleCopyAddress = useCallback(async (): Promise<void> => {
    if (!propertyAddress) return;
    try {
      await navigator.clipboard.writeText(propertyAddress);
      showToast.success('Address copied');
    } catch {
      showToast.error('Could not copy address');
    }
  }, [propertyAddress]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <MUITypography variant="sectionTitle">Site location</MUITypography>

          {propertyAddress ? (
            <MUITypography variant="body" sx={{ whiteSpace: 'pre-line' }}>
              {propertyAddress}
            </MUITypography>
          ) : null}

          {hasMap ? (
            <Box
              sx={{
                width: '100%',
                height: 200,
                borderRadius: radius['card-functional'],
                overflow: 'hidden',
              }}
            >
              <Map
                defaultCenter={{
                  lat: propertyCoordinates!.latitude,
                  lng: propertyCoordinates!.longitude,
                }}
                defaultZoom={16}
                mapTypeId="hybrid"
                gestureHandling="cooperative"
                streetViewControl={false}
                fullscreenControl
                zoomControl
                className="w-full h-full"
              >
                <Marker
                  position={{
                    lat: propertyCoordinates!.latitude,
                    lng: propertyCoordinates!.longitude,
                  }}
                />
              </Map>
            </Box>
          ) : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {directionsUrl ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DirectionsOutlinedIcon />}
                component="a"
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions
              </Button>
            ) : null}
            {propertyAddress ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContentCopyOutlinedIcon />}
                onClick={() => void handleCopyAddress()}
              >
                Copy address
              </Button>
            ) : null}
          </Stack>

          {!hasMap && propertyAddress ? (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <MapOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <MUITypography variant="finePrint" sx={{ color: 'text.secondary' }}>
                No map pin on this property — directions use the address text.
              </MUITypography>
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ServiceTicketLocationCard({
  propertyAddress,
  propertyCoordinates,
}: ServiceTicketLocationCardProps): JSX.Element | null {
  const { mapsApiKey: configMapsKey } = useConfig();
  const mapsApiKey = configMapsKey || config.thirdParty.googleMapsApiKey || '';

  if (!propertyAddress && !propertyCoordinates) return null;

  if (!mapsApiKey) {
    return (
      <LocationCardContent
        propertyAddress={propertyAddress}
        propertyCoordinates={propertyCoordinates}
        mapsApiKey=""
      />
    );
  }

  return (
    <APIProvider apiKey={mapsApiKey}>
      <LocationCardContent
        propertyAddress={propertyAddress}
        propertyCoordinates={propertyCoordinates}
        mapsApiKey={mapsApiKey}
      />
    </APIProvider>
  );
}
