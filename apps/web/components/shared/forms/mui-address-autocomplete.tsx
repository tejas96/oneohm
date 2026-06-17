'use client';

import { Collapse } from '@mui/material';
import { APIProvider, useApiIsLoaded, useMapsLibrary } from '@vis.gl/react-google-maps';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { AddressMapViewer } from './address-map-viewer';

import { Alert } from '@/components/shared';
import { MUIInput } from '@/components/ui';
import { config } from '@/lib/config/config';
import { useDebounce } from '@/lib/hooks';

type SearchOption =
  | string
  | { label?: string; value?: string; disabled?: boolean; [key: string]: unknown };

interface AutocompleteSearchOption {
  label: string;
  value: string;
  prediction: google.maps.places.AutocompletePrediction;
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

interface AddressAutocompleteFormProps extends MUIAddressAutocompleteProps {
  mapsError?: string | null;
}

interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/**
 * AddressAutocompleteForm Component (descendant of APIProvider)
 */
function AddressAutocompleteForm({
  addressName = 'address',
  cityName = 'city',
  stateName = 'state',
  pincodeName = 'pincode',
  countryName = 'country',
  latitudeName = 'latitude',
  longitudeName = 'longitude',
  showMap = false,
  required = false,
  mapsError: externalMapsError = null,
}: AddressAutocompleteFormProps): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const apiIsLoaded = useApiIsLoaded();
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');

  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [mapsError, setMapsError] = React.useState<string | null>(externalMapsError);

  const [autocompleteService, setAutocompleteService] =
    React.useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = React.useState<google.maps.places.PlacesService | null>(
    null,
  );
  const [geocoder, setGeocoder] = React.useState<google.maps.Geocoder | null>(null);
  const sessionTokenRef = React.useRef<google.maps.places.AutocompleteSessionToken | undefined>(
    undefined,
  );
  const isTypingRef = React.useRef(false);
  const geocodeAttempted = React.useRef(false);

  // Watch fields
  const currentAddress = watch(addressName) as string | undefined;
  const currentCity = watch(cityName) as string | undefined;
  const currentState = watch(stateName) as string | undefined;
  const currentPincode = watch(pincodeName) as string | undefined;
  const currentCountry = watch(countryName) as string | undefined;
  const currentLat = watch(latitudeName) as number | string | undefined;
  const currentLng = watch(longitudeName) as number | string | undefined;

  const [mapVisible, setMapVisible] = React.useState(false);

  const debouncedQuery = useDebounce(inputValue, 550);

  // Synchronize map visibility with watch fields
  React.useEffect(() => {
    if (showMap && (currentLat || currentAddress)) {
      setMapVisible(true);
    }
  }, [showMap, currentLat, currentAddress]);

  // Synchronize searchValue with form's current address
  React.useEffect(() => {
    if (currentAddress !== undefined) {
      setInputValue(currentAddress || '');
    }
  }, [currentAddress]);

  // Instantiate Google Maps Services once libraries are loaded
  React.useEffect(() => {
    if (!apiIsLoaded || !placesLib) return;

    try {
      setAutocompleteService(new placesLib.AutocompleteService());
      const dummyDiv = document.createElement('div');
      setPlacesService(new placesLib.PlacesService(dummyDiv));
    } catch (err) {
      console.error('Failed to initialize Google Places services:', err);
      setMapsError('Failed to initialize search services.');
    }
  }, [apiIsLoaded, placesLib]);

  React.useEffect(() => {
    if (!apiIsLoaded || !geocodingLib) return;

    try {
      setGeocoder(new geocodingLib.Geocoder());
    } catch (err) {
      console.error('Failed to initialize Google Geocoder:', err);
    }
  }, [apiIsLoaded, geocodingLib]);

  // Fetch Autocomplete Predictions when query changes (debounced)
  React.useEffect(() => {
    if (!autocompleteService || !debouncedQuery.trim() || !isTypingRef.current) {
      setOptions([]);
      return;
    }

    // Initialize session token if not present
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }

    setLoading(true);

    const indiaBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(6.5, 68.1),
      new google.maps.LatLng(35.7, 97.4),
    );

    void autocompleteService.getPlacePredictions(
      {
        input: debouncedQuery,
        sessionToken: sessionTokenRef.current,
        bounds: indiaBounds,
      },
      (predictions, status) => {
        setLoading(false);
        if ((status as unknown as string) === 'OK' && predictions) {
          setOptions(predictions);
        } else {
          setOptions([]);
        }
      },
    );
  }, [debouncedQuery, autocompleteService]);

  // Geocode initial address if coordinates are missing (common in edit mode)
  React.useEffect(() => {
    if (!geocoder || !currentAddress || geocodeAttempted.current || (currentLat && currentLng)) {
      if (currentLat && currentLng) {
        geocodeAttempted.current = true;
      }
      return;
    }

    geocodeAttempted.current = true;

    // Construct full address for geocoding to ensure accuracy
    const addressParts = [currentAddress, currentCity, currentState, currentPincode, currentCountry]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0);

    const fullGeocodeAddress = addressParts.join(', ');

    // Use cast to any to bypass GeocoderRequest union type checking constraints in @types/google.maps
    void geocoder.geocode({ address: fullGeocodeAddress } as any, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const location = results[0].geometry.location;
        setValue(latitudeName, location.lat(), { shouldValidate: true });
        setValue(longitudeName, location.lng(), { shouldValidate: true });
      }
    });
  }, [
    geocoder,
    currentAddress,
    currentCity,
    currentState,
    currentPincode,
    currentCountry,
    currentLat,
    currentLng,
    latitudeName,
    longitudeName,
    setValue,
  ]);

  // Handle Autocomplete selection
  const handleOptionSelect = (option: SearchOption | null): void => {
    if (!option || typeof option === 'string') return;

    if (!placesService) return;

    // Cast through unknown to safely resolve type boundaries
    const selectedOption = option as unknown as AutocompleteSearchOption;
    const prediction = selectedOption.prediction;

    setLoading(true);

    void placesService.getDetails(
      {
        placeId: prediction.place_id,
        sessionToken: sessionTokenRef.current,
        fields: ['geometry', 'address_components', 'formatted_address', 'name'],
      },
      (place, status) => {
        setLoading(false);
        // Clear session token to reset billing session
        sessionTokenRef.current = undefined;

        if ((status as unknown as string) === 'OK' && place) {
          const components = place.address_components;
          if (!components) return;

          const parsed = parseAddressComponents(components);

          let fullAddr = place.formatted_address || '';
          if (place.name && !fullAddr.includes(place.name)) {
            fullAddr = `${place.name}, ${fullAddr}`;
          }
          fullAddr = fullAddr.replace(/, India$/, '');

          setInputValue(fullAddr);
          isTypingRef.current = false;

          // Populate form fields
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

          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setValue(latitudeName, lat, { shouldDirty: true, shouldValidate: true });
            setValue(longitudeName, lng, { shouldDirty: true, shouldValidate: true });

            if (showMap) {
              setMapVisible(true);
            }
          }
        }
      },
    );
  };

  // Dragging marker updates form and reverse-geocodes
  const handleMarkerDragEnd = React.useCallback(
    (lat: number, lng: number) => {
      setValue(latitudeName, lat, { shouldDirty: true, shouldValidate: true });
      setValue(longitudeName, lng, { shouldDirty: true, shouldValidate: true });

      if (!geocoder) return;

      // Use cast to any to bypass GeocoderRequest union type checking constraints in @types/google.maps
      void geocoder.geocode({ location: { lat, lng } } as any, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const parsed = parseAddressComponents(results[0].address_components);
          const fullAddr = (results[0].formatted_address || '').replace(/, India$/, '');

          setInputValue(fullAddr);
          isTypingRef.current = false;

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
    },
    [
      geocoder,
      setValue,
      addressName,
      cityName,
      stateName,
      countryName,
      pincodeName,
      latitudeName,
      longitudeName,
    ],
  );

  // Map Google predictions to search options compatible with MUIInput
  const searchOptions = options.map((pred) => ({
    label: pred.description,
    value: pred.place_id,
    prediction: pred,
  })) as SearchOption[];

  return (
    <div className="space-y-4">
      {/* MUI Autocomplete programmatic SearchBox */}
      <MUIInput
        mode="autocomplete"
        id="address-autocomplete-search"
        fieldLabel="Search Location"
        disabled={!apiIsLoaded || Boolean(mapsError)}
        options={searchOptions}
        value={null}
        onChange={handleOptionSelect}
        inputValue={inputValue}
        onInputChange={(val) => {
          setInputValue(val);
          isTypingRef.current = true;
        }}
        loading={loading}
        noOptionsText={inputValue ? 'No suggestions found' : 'Type to search...'}
        textFieldProps={{
          placeholder: mapsError
            ? 'Google Places unavailable'
            : 'Type to search address on Google Maps...',
          className: 'bg-background-elevated',
          size: 'small',
        }}
      />

      {mapsError && (
        <Alert variant="warning" appearance="minimal" className="py-2 text-xs">
          {mapsError}. You can still enter your address details manually.
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

      {/* Map Section */}
      {showMap && mapVisible && (
        <Collapse in={mapVisible}>
          <AddressMapViewer
            latitude={currentLat}
            longitude={currentLng}
            onMarkerDragEnd={handleMarkerDragEnd}
          />
        </Collapse>
      )}
    </div>
  );
}

/**
 * Main MUIAddressAutocomplete Component
 */
export function MUIAddressAutocomplete(props: MUIAddressAutocompleteProps): React.JSX.Element {
  const apiKey = config.thirdParty.googleMapsApiKey;

  if (!apiKey) {
    return (
      <AddressAutocompleteForm
        {...props}
        mapsError="Google Maps API key is missing. Make sure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is defined in your environment."
      />
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'geocoding']}>
      <AddressAutocompleteForm {...props} />
    </APIProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Parse Google address components into structured address parts
 */
function parseAddressComponents(components: google.maps.GeocoderAddressComponent[]): ParsedAddress {
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
