declare namespace google {
  namespace maps {
    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    interface GeocoderResult {
      address_components: GeocoderAddressComponent[];
      formatted_address: string;
      geometry: {
        location: LatLng;
      };
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
    }

    interface PlaceResult {
      address_components?: GeocoderAddressComponent[];
      formatted_address?: string;
      name?: string;
      geometry?: {
        location?: LatLng;
      };
    }

    class Map {
      constructor(element: HTMLElement, options?: any);
      setCenter(latLng: { lat: number; lng: number }): void;
      setZoom(zoom: number): void;
      controls: any[];
    }

    class Marker {
      constructor(options?: any);
      setPosition(latLng: { lat: number; lng: number }): void;
      getPosition(): LatLng | undefined;
      addListener(event: string, handler: () => void): any;
      setMap(map: Map | null): void;
    }

    namespace places {
      class Autocomplete {
        constructor(input: HTMLInputElement, options?: any);
        addListener(event: string, handler: () => void): any;
        getPlace(): PlaceResult;
      }
      class SearchBox {
        constructor(input: HTMLInputElement, options?: any);
        addListener(event: string, handler: () => void): any;
        getPlaces(): PlaceResult[];
      }
    }

    class Geocoder {
      geocode(
        request: { location: { lat: number; lng: number } },
        callback: (results: GeocoderResult[] | null, status: string) => void,
      ): void;
    }

    namespace event {
      function removeListener(listener: any): void;
    }

    enum Animation {
      DROP = 1,
      BOUNCE = 2,
    }

    enum ControlPosition {
      BOTTOM_CENTER = 11,
      BOTTOM_LEFT = 10,
      BOTTOM_RIGHT = 12,
      LEFT_BOTTOM = 6,
      LEFT_CENTER = 4,
      LEFT_TOP = 5,
      RIGHT_BOTTOM = 9,
      RIGHT_CENTER = 8,
      RIGHT_TOP = 7,
      TOP_CENTER = 2,
      TOP_LEFT = 1,
      TOP_RIGHT = 3,
    }
  }
}

interface Window {
  google?: typeof google;
}
