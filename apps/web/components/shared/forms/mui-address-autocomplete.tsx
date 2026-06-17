'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useFormContext } from 'react-hook-form';
import SearchIcon from '@mui/icons-material/Search';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { Box, CircularProgress, Collapse } from '@mui/material';

import { useGoogleMapsLoader } from '@/lib/hooks/use-google-maps-loader';
import { MUIInput } from '@/components/ui';
import { Alert } from '@/components/shared';

// Parse Google address components into structured address parts
function parseAddressComponents(components: google.maps.GeocoderAddressComponent[]): {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
} {
  let streetNumber = '';
  let route = '';
  let sublocality1 = '';
  let sublocality2 = '';
  let locality = '';
  let adminArea2 = ''; // administrative_area_level_2 (district/division)
  let state = '';
  let pincode = '';
  let country = '';

  for (const component of components) {
    const types = component.types;
    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
      sublocality1 = component.long_name;
    } else if (types.includes('sublocality_level_2')) {
      sublocality2 = component.long_name;
    } else if (types.includes('locality')) {
      locality = component.long_name;
    } else if (types.includes('administrative_area_level_2')) {
      adminArea2 = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = component.long_name;
    } else if (types.includes('postal_code')) {
      pincode = component.long_name;
    } else if (types.includes('country')) {
      country = component.long_name;
    }
  }

  // Prefer locality (City/Town) over administrative_area_level_2 (District)
  const city = locality || adminArea2 || sublocality1 || '';
  const streetParts = [streetNumber, route, sublocality2, sublocality1].filter(Boolean);
  const street = streetParts.length > 0 ? streetParts.join(', ') : locality || city || '';

  return {
    street,
    city,
    state,
    pincode,
    country,
  };
}

export interface MUIAddressAutocompleteProps {
  addressName?: string;
  cityName?: string;
  stateName?: string;
  pincodeName?: string;
  countryName?: string;
  latitudeName?: string;
  longitudeName?: string;
  showMap?: boolean;
  required?: boolean;
}

export function MUIAddressAutocomplete({
  addressName = 'address',
  cityName = 'city',
  stateName = 'state',
  pincodeName = 'pincode',
  countryName = 'country',
  latitudeName = 'latitude',
  longitudeName = 'longitude',
  showMap = false,
  required = false,
}: MUIAddressAutocompleteProps): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const { loaded: mapsLoaded, error: mapsError } = useGoogleMapsLoader();

  // State to hold the active search input HTML element dynamically
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [searchInputNode, setSearchInputNodeState] = React.useState<HTMLInputElement | null>(null);

  const setSearchInputNode = React.useCallback((node: HTMLInputElement | null) => {
    searchInputRef.current = node;
    setSearchInputNodeState(node);
  }, []);

  const [searchValue, setSearchValue] = React.useState('');

  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.Marker | null>(null);
  const mapControlDivRef = React.useRef<HTMLDivElement | null>(null);
  const geocodeAttempted = React.useRef(false);

  const [portalTarget, setPortalTarget] = React.useState<HTMLDivElement | null>(null);
  const [localContainer, setLocalContainer] = React.useState<HTMLDivElement | null>(null);

  // Watch fields to toggle map visibility in edit/populated mode
  const currentAddress = watch(addressName) as string | undefined;
  const currentLat = watch(latitudeName) as number | string | undefined;
  const currentLng = watch(longitudeName) as number | string | undefined;

  // Decide if map should be visible
  const [mapVisible, setMapVisible] = React.useState(false);

  // Synchronize map visibility with watch fields (useful for edit mode initial state)
  React.useEffect(() => {
    if (showMap && (currentLat || currentAddress)) {
      setMapVisible(true);
    }
  }, [showMap, currentLat, currentAddress]);

  // Synchronize searchValue with form's current address (e.g. initial loads or external profile pre-fills)
  React.useEffect(() => {
    if (currentAddress !== undefined) {
      setSearchValue(currentAddress || '');
    }
  }, [currentAddress]);

  // Hook up Google Places SearchBox (Main Input) dynamically when the input element mounts
  React.useEffect(() => {
    if (!mapsLoaded || !searchInputNode || !window.google?.maps?.places) return;

    const indiaBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(6.5, 68.1),
      new window.google.maps.LatLng(35.7, 97.4),
    );

    const searchBox = new window.google.maps.places.SearchBox(searchInputNode, {
      bounds: indiaBounds,
    });

    const listener = searchBox.addListener('places_changed', () => {
      const places = searchBox.getPlaces();
      if (!places || places.length === 0) return;

      const place = places[0];
      if (!place || !place.address_components) return;

      const parsed = parseAddressComponents(place.address_components);

      // Autofill fields
      // Combine place name (landmark) and formatted address for complete details
      let fullAddr = place.formatted_address || '';
      if (place.name && !fullAddr.includes(place.name)) {
        fullAddr = `${place.name}, ${fullAddr}`;
      }
      fullAddr = fullAddr.replace(/, India$/, '');

      setSearchValue(fullAddr);

      setValue(addressName, fullAddr, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(cityName, parsed.city, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(stateName, parsed.state, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(countryName, parsed.country || 'India', {
        shouldDirty: true,
        shouldValidate: true,
      });

      if (parsed.pincode) {
        setValue(pincodeName, parsed.pincode, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      // Update coordinates if geometry is available
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setValue(latitudeName, lat, { shouldDirty: true, shouldValidate: true });
        setValue(longitudeName, lng, { shouldDirty: true, shouldValidate: true });

        // Show map and center it
        if (showMap) {
          setMapVisible(true);
          if (mapRef.current) {
            mapRef.current.setCenter({ lat, lng });

            // Zoom closer in fullscreen mode for rooftop verification
            const isFullscreen = !!(
              document.fullscreenElement ||
              (document as any).webkitFullscreenElement ||
              (document as any).mozFullScreenElement ||
              (document as any).msFullscreenElement
            );
            mapRef.current.setZoom(isFullscreen ? 18 : 17);

            if (markerRef.current) {
              markerRef.current.setPosition({ lat, lng });
            }
          }
        }
      }
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [
    mapsLoaded,
    searchInputNode,
    addressName,
    cityName,
    stateName,
    pincodeName,
    countryName,
    latitudeName,
    longitudeName,
    showMap,
    setValue,
  ]);

  // Hook up Google Map, Marker, and Fullscreen Search Box Portaling
  React.useEffect(() => {
    if (!mapsLoaded || !mapVisible || !mapContainerRef.current || !window.google?.maps) return;

    const latVal = parseFloat(currentLat as string) || 12.9716;
    const lngVal = parseFloat(currentLng as string) || 77.5946;
    const initialPosition = { lat: latVal, lng: lngVal };

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: initialPosition,
      zoom: 16,
      mapTypeId: 'hybrid', // Satellite view with labels
      mapTypeControl: true, // Allow user to toggle Map/Satellite views
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });
    mapRef.current = map;

    const marker = new window.google.maps.Marker({
      position: initialPosition,
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      title: 'Drag to adjust location',
    });
    markerRef.current = marker;

    // Handle marker dragend
    const markerDragListener = marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        const lat = position.lat();
        const lng = position.lng();

        setValue(latitudeName, lat, { shouldDirty: true, shouldValidate: true });
        setValue(longitudeName, lng, { shouldDirty: true, shouldValidate: true });

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const parsed = parseAddressComponents(results[0].address_components);
            const fullAddr = (results[0].formatted_address || '').replace(/, India$/, '');

            setSearchValue(fullAddr);
            setValue(addressName, fullAddr, { shouldDirty: true, shouldValidate: true });
            setValue(cityName, parsed.city, { shouldDirty: true, shouldValidate: true });
            setValue(stateName, parsed.state, { shouldDirty: true, shouldValidate: true });
            setValue(countryName, parsed.country || 'India', {
              shouldDirty: true,
              shouldValidate: true,
            });

            if (parsed.pincode) {
              setValue(pincodeName, parsed.pincode, { shouldDirty: true, shouldValidate: true });
            }
          }
        });
      }
    });

    // Create Map Search Container (only used for portaling in fullscreen)
    const controlDiv = document.createElement('div');
    controlDiv.className = 'map-fullscreen-search-container w-72 m-2.5';
    map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(controlDiv);
    mapControlDivRef.current = controlDiv;

    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (isFullscreen) {
        setPortalTarget(mapControlDivRef.current);

        // Instantly move existing pac-containers to map container
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach((container) => {
          if (mapContainerRef.current && !mapContainerRef.current.contains(container)) {
            mapContainerRef.current.appendChild(container);
          }
        });

        // Focus the input inside fullscreen
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 150);
      } else {
        setPortalTarget(null);

        // Return pac-containers to document body
        const pacContainers = mapContainerRef.current?.querySelectorAll('.pac-container');
        pacContainers?.forEach((container) => {
          document.body.appendChild(container);
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Watch for dynamically added .pac-container (Google suggestions) in the DOM
    const observer = new MutationObserver((mutations) => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (isFullscreen) {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement && node.classList.contains('pac-container')) {
              if (mapContainerRef.current && !mapContainerRef.current.contains(node)) {
                mapContainerRef.current.appendChild(node);
              }
            }
          });
        });
      }
    });

    observer.observe(document.body, { childList: true });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      observer.disconnect();

      if (markerDragListener) {
        google.maps.event.removeListener(markerDragListener);
      }

      // Cleanup control and reset state
      map.controls[window.google.maps.ControlPosition.TOP_LEFT].clear();
      mapControlDivRef.current = null;
      setPortalTarget(null);

      marker.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [mapsLoaded, mapVisible]);

  // Geocode initial address if coordinates are missing (common in edit mode)
  React.useEffect(() => {
    if (!mapsLoaded || !window.google?.maps) return;

    // If coordinates are already present, we consider the map synced.
    if (currentLat && currentLng) {
      geocodeAttempted.current = true;
      return;
    }

    if (!currentAddress) return;
    if (geocodeAttempted.current) return;

    geocodeAttempted.current = true;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: currentAddress } as any, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        setValue(latitudeName, lat, { shouldValidate: true });
        setValue(longitudeName, lng, { shouldValidate: true });
      }
    });
  }, [mapsLoaded, currentAddress, currentLat, currentLng, latitudeName, longitudeName, setValue]);

  // Synchronize map center and marker position with form coordinates when they change externally
  React.useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    const latVal = parseFloat(currentLat as string);
    const lngVal = parseFloat(currentLng as string);
    if (isNaN(latVal) || isNaN(lngVal)) return;

    const currentPos = markerRef.current.getPosition();

    // Only update map center if it's different to prevent layout loops
    const distanceThreshold = 0.0001; // roughly 10 meters
    if (currentPos) {
      const latDiff = Math.abs(currentPos.lat() - latVal);
      const lngDiff = Math.abs(currentPos.lng() - lngVal);
      if (latDiff > distanceThreshold || lngDiff > distanceThreshold) {
        markerRef.current.setPosition({ lat: latVal, lng: lngVal });
        mapRef.current.setCenter({ lat: latVal, lng: lngVal });
      }
    }
  }, [currentLat, currentLng]);

  // Search input definition
  const searchInput = (
    <MUIInput
      ref={setSearchInputNode}
      id="address-autocomplete-search"
      fieldLabel={portalTarget ? undefined : 'Search Location'}
      placeholder={
        mapsError ? 'Google Places unavailable' : 'Type to search address on Google Maps...'
      }
      size="small"
      disabled={!mapsLoaded || Boolean(mapsError)}
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
      startIcon={
        !mapsLoaded && !mapsError ? (
          <CircularProgress size={16} color="inherit" />
        ) : (
          <SearchIcon fontSize="small" className="text-foreground-secondary" />
        )
      }
      className="bg-background-elevated"
    />
  );

  const portalContainer = portalTarget || localContainer;

  return (
    <div className="space-y-4">
      {/* Autocomplete Search input local container */}
      <div ref={setLocalContainer} className="relative" />

      {/* React Portal to render the input in the appropriate container */}
      {portalContainer && createPortal(searchInput, portalContainer)}

      {/* Global styles including map overrides */}
      <style jsx global>{`
        .pac-container {
          z-index: 1400 !important;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgb(0 0 0 / 15%);
          border: 1px solid var(--border-light, #e2e8f0);
          font-family: inherit;
        }
        .pac-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .pac-item:hover {
          background-color: var(--background-hover, #f8fafc);
        }
        .pac-item-query {
          font-size: 14px;
          color: var(--text-primary, #0f172a);
        }
        .pac-matched {
          font-weight: 600;
        }

        /* Map fullscreen custom control overrides */
        .map-fullscreen-search-container .MuiFormControl-root {
          width: 100% !important;
          margin: 0 !important;
        }
        .map-fullscreen-search-container .MuiInputBase-root {
          background-color: white !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgb(0 0 0 / 15%) !important;
          border: 1px solid #cbd5e1 !important;
        }
        .map-fullscreen-search-container .MuiFormHelperText-root,
        .map-fullscreen-search-container label,
        .map-fullscreen-search-container .MuiFormLabel-root {
          display: none !important;
        }
      `}</style>

      {mapsError && (
        <Alert variant="warning" appearance="minimal" className="py-2 text-xs">
          Places search failed to load. You can still enter your address details manually.
        </Alert>
      )}

      {/* Manual editable inputs */}
      <MUIInput
        id={addressName}
        fieldLabel="Full Address"
        required={required}
        placeholder="Street address, area, landmark"
        size="small"
        multiline
        rows={3}
        {...register(addressName)}
        error={errors[addressName]?.message as string | undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MUIInput
          id={cityName}
          fieldLabel="City"
          required={required}
          placeholder="Enter city"
          size="small"
          {...register(cityName)}
          error={errors[cityName]?.message as string | undefined}
        />

        <MUIInput
          id={stateName}
          fieldLabel="State"
          required={required}
          placeholder="Enter state"
          size="small"
          {...register(stateName)}
          error={errors[stateName]?.message as string | undefined}
        />

        <MUIInput
          id={pincodeName}
          fieldLabel="Pincode"
          required={required}
          placeholder="123456"
          size="small"
          inputProps={{ maxLength: 6 }}
          {...register(pincodeName)}
          error={errors[pincodeName]?.message as string | undefined}
        />

        <MUIInput
          id={countryName}
          fieldLabel="Country"
          required={required}
          placeholder="Enter country"
          size="small"
          {...register(countryName)}
          error={errors[countryName]?.message as string | undefined}
        />
      </div>

      {/* Draggable Map Section */}
      {showMap && mapVisible && (
        <Collapse in={mapVisible}>
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground-secondary font-medium">
              <MapOutlinedIcon sx={{ fontSize: 14 }} />
              <span>Pinpoint Accurate Location (Drag marker to adjust)</span>
            </div>

            <div
              ref={mapContainerRef}
              className="w-full h-64 rounded-xl border border-border-light overflow-hidden shadow-inner bg-background-elevated"
              style={{ minHeight: '256px' }}
            />

            {currentLat && currentLng && (
              <Box className="flex gap-4 justify-end text-[10px] text-foreground-tertiary font-mono">
                <span>Lat: {parseFloat(currentLat as string).toFixed(6)}</span>
                <span>Lng: {parseFloat(currentLng as string).toFixed(6)}</span>
              </Box>
            )}
          </div>
        </Collapse>
      )}
    </div>
  );
}
