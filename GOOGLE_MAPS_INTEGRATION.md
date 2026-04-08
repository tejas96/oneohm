# Google Maps Address Autocomplete Implementation

## Overview
This feature adds Google Maps address search with autocomplete suggestions and automatic address component extraction (city, state, pincode) for your frontend application. The implementation is reusable, follows your coding standards, and is integrated into both the Customer and Property forms.

## Features
✅ **Address Search with Suggestions** - Type a few letters and get address suggestions from Google Maps
✅ **India-Only Filtering** - Only searches for addresses within India
✅ **Auto-Fill Address Components** - Automatically fills city, state, pincode, and country based on selected address
✅ **Reusable Component** - Use the same component in any form
✅ **React Hook Form Integration** - Seamlessly works with your existing form setup
✅ **Type-Safe** - Full TypeScript support
✅ **Minimal UI Changes** - Only the address field adds a dropdown for suggestions
✅ **Error Handling** - Graceful error messages if Google Maps API fails

## Setup & Configuration

### 1. **Google Maps API Key**
Your `.env` file already has the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` variable. Add your Google Maps API key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Make sure your API key has these services enabled in Google Cloud Console:**
- Maps JavaScript API
- Places API
- Geocoding API

### 2. **Installed Package**
The required package has been installed:
- `@googlemaps/js-api-loader` - For loading Google Maps API

## Implementation Details

### Architecture

```
┌─────────────────────────────────────────┐
│  Forms (customer-form, property-form)  │
└──────────────────┬──────────────────────┘
                   │ uses
                   ▼
    ┌──────────────────────────────────┐
    │ AddressAutocompleteInput         │
    │ (React Hook Form integrated)     │
    └─────────────┬────────────────────┘
                  │ uses
                  ▼
    ┌──────────────────────────────────┐
    │ useGooglePlacesAutocomplete      │
    │ (Custom Hook)                    │
    └─────────────┬────────────────────┘
                  │ uses
                  ▼
    └──────────────────────────────────┐
       - google-maps-geocoding.ts      │
       (Utility functions)              │
    ────────────────────────────────────┘
```

### Key Files

#### 1. **Utility Functions** (`lib/utils/google-maps-geocoding.ts`)
- `extractAddressComponentsFromPlace()` - Extracts city, state, pincode, country from Google Places result
- `isPlaceInIndia()` - Validates that selected address is within India
- `hasAllAddressComponents()` - Checks if all required fields are present

#### 2. **Custom Hook** (`lib/hooks/useGooglePlacesAutocomplete.ts`)
- Handles Google Maps API initialization
- Manages autocomplete predictions
- Filters results to India only
- Extracts address components on selection

#### 3. **Reusable Component** (`components/shared/address-autocomplete-input.tsx`)
- React Hook Form integration
- Dropdown UI for suggestions
- Keyboard navigation (arrow keys, enter, escape)
- Debounced predictions (300ms)
- Minimum 3 characters for search

#### 4. **Form Integration** (both forms)
- `handleAddressSelected` callback - Sets form fields when address is selected
- Auto-fills: address, city, state, pincode

## Usage

### In Existing Forms (Already Done)
Both customer and property forms now use the component:

```tsx
<AddressAutocompleteInput
  control={form.control}
  name="address"
  placeholder="Search address or enter..."
  onAddressSelected={handleAddressSelected}
  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
/>
```

### In New Forms (If Needed)
To add this to another form:

```tsx
import { AddressAutocompleteInput } from '@/components/shared';
import { useForm } from 'react-hook-form';

// In your component:
const form = useForm({ /* your config */ });

// For address selection callback:
const handleAddressSelected = (addressComponents: {
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}) => {
  form.setValue('address', addressComponents.address);
  form.setValue('city', addressComponents.city);
  form.setValue('state', addressComponents.state);
  form.setValue('pincode', addressComponents.pincode);
};

// In your JSX:
<AddressAutocompleteInput
  control={form.control}
  name="address"
  placeholder="Search and select address"
  onAddressSelected={handleAddressSelected}
  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
/>
```

## Behavior

### What Happens When User Types
1. User types 3 or more characters in the address field
2. Google Maps Autocomplete API is called (with 300ms debounce)
3. Results are filtered to show only places in India
4. Dropdown displays suggestions with formatted address

### What Happens When User Selects an Address
1. Full place details are fetched from Google Maps
2. Verification that place is within India
3. Address components (city, state, pincode) are extracted
4. Form fields are auto-filled:
   - `address` - Full formatted address
   - `city` - Extracted city
   - `state` - Extracted state
   - `pincode` - Extracted postal code
   - `country` - Set to "India"
5. Dropdown is closed
6. User can submit the form

### Error Handling
- If API key is missing: Error message displayed
- If Google Maps API fails to load: Error shown
- If selected place is outside India: User is informed to select India address
- If address extraction fails: User can manually enter details

## Code Standards Applied

✅ **TypeScript** - Full type safety with proper interfaces
✅ **React Hooks** - Custom hooks for reusability
✅ **React Hook Form** - Proper integration with form library
✅ **Zod Validation** - Works with existing validation schemas
✅ **Composition** - Small, focused, single-responsibility functions
✅ **Error Handling** - Try-catch blocks and user feedback
✅ **Performance** - Debounced API calls, memoized callbacks
✅ **Accessibility** - Keyboard navigation support, screen reader friendly
✅ **Modularity** - Easy to reuse in other components

## Styling

The component uses your existing Tailwind CSS design system. The dropdown adapts to your current theme with:
- Radix UI components (`Textarea`)
- Tailwind utility classes
- Inherited form styles

## Testing the Feature

### In Customer Form:
1. Go to Create New Customer or Edit Customer
2. In the Address section, start typing an address (e.g., "Bangalore")
3. See suggestions appear
4. Click on a suggestion to auto-fill city, state, pincode

### In Property Form:
1. Go to Create New Property or Edit Property
2. Find the Property Address section
3. Search for an address (e.g., "Mumbai")
4. Select from suggestions to auto-fill location details

## Environment Variables

```env
# API Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here  # Add your Google Maps API key
```

## Limitations & Future Enhancements

### Current Limitations:
- Only searches within India
- Requires internet connection for autocomplete
- Limited to text-based search (no map picker UI)

### Possible Future Enhancements:
1. Add map picker UI for visual address selection
2. Support multiple countries
3. Address verification via geocoding API
4. Recently used addresses tracking
5. Address formatting options

## Troubleshooting

**Issue: Suggestions not appearing**
- Check your Google Maps API key is valid
- Ensure Places API is enabled in Google Cloud Console
- Check browser console for errors

**Issue: Wrong address selected**
- Use more specific search terms
- The component prioritizes exact matches

**Issue: Auto-fill not working**
- Ensure all form fields exist (address, city, state, pincode)
- Check browser console for errors
- Verify form control names match component usage

## File Structure

```
apps/web/
├── lib/
│   ├── hooks/
│   │   ├── index.ts (exported useGooglePlacesAutocomplete)
│   │   └── useGooglePlacesAutocomplete.ts ✨ NEW
│   └── utils/
│       └── google-maps-geocoding.ts ✨ NEW
├── components/
│   ├── shared/
│   │   ├── index.ts (exported AddressAutocompleteInput)
│   │   └── address-autocomplete-input.tsx ✨ NEW
│   └── features/
│       ├── customers/
│       │   └── components/
│       │       └── customer-form.tsx ✏️ MODIFIED
│       └── properties/
│           └── components/
│               └── property-form.tsx ✏️ MODIFIED
└── .env (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY already exists)
```

## Contributing

When extending this feature:
1. Keep utility functions pure and testable
2. Add proper TypeScript types
3. Handle all error cases
4. Test with different Indian addresses
5. Maintain backward compatibility with existing forms
