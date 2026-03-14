# Location Map API – Address Autocomplete – File Changes

Use this document when creating a new branch to add **only** the Google Places address autocomplete feature. Copy the file list and paste it into your request.

---

## Files to Add (NEW)

| File Path | Description |
|-----------|-------------|
| `apps/backend/src/modules/location/location.module.ts` | NestJS module for Location |
| `apps/backend/src/modules/location/index.ts` | Barrel export |
| `apps/backend/src/modules/location/controllers/location.controller.ts` | REST endpoints: autocomplete, details |
| `apps/backend/src/modules/location/controllers/index.ts` | Controllers barrel |
| `apps/backend/src/modules/location/services/location.service.ts` | Google Places API calls + cache |
| `apps/backend/src/modules/location/services/index.ts` | Services barrel |
| `apps/web/components/features/customers/components/address-autocomplete.tsx` | Autocomplete input component |
| `apps/web/components/features/customers/hooks/use-address-autocomplete.ts` | Debounced search + place details hook |

---

## Files to Modify (EXISTING)

| File Path | Changes |
|-----------|---------|
| `apps/backend/src/app.module.ts` | Import `LocationModule`, add to `imports` array |
| `apps/web/components/features/customers/components/customer-form.tsx` | Replace Street Address input with `AddressAutocomplete`; expand `INDIAN_STATES_AND_UTS` to all 28 states + UTs |
| `apps/web/components/features/customers/hooks/index.ts` | Export `useAddressAutocomplete`, `PlaceSuggestion`, `PlaceDetails` |
| `apps/web/components/features/customers/index.ts` | Export `AddressAutocomplete`, `useAddressAutocomplete`, `PlaceSuggestion`, `PlaceDetails` |
| `apps/backend/.env` | Add `GOOGLE_MAPS_API_KEY=...` (or add manually; do not commit if `.env` is gitignored) |

---

## Environment Variable

Add to `apps/backend/.env`:

```
GOOGLE_MAPS_API_KEY=AIzaSyC2zFvl0xjO_TSosNQiU4yuN1gAr6aVbIw
```

*(Use your own API key in production.)*

---

## Quick Copy (for git checkout)

```text
apps/backend/src/modules/location/
apps/backend/src/app.module.ts
apps/web/components/features/customers/components/address-autocomplete.tsx
apps/web/components/features/customers/hooks/use-address-autocomplete.ts
apps/web/components/features/customers/components/customer-form.tsx
apps/web/components/features/customers/hooks/index.ts
apps/web/components/features/customers/index.ts
```

---

## Request Template (for AI/Cursor)

```
Add only the Location Map API changes for address autocomplete. Use these files:

NEW FILES:
- apps/backend/src/modules/location/location.module.ts
- apps/backend/src/modules/location/index.ts
- apps/backend/src/modules/location/controllers/location.controller.ts
- apps/backend/src/modules/location/controllers/index.ts
- apps/backend/src/modules/location/services/location.service.ts
- apps/backend/src/modules/location/services/index.ts
- apps/web/components/features/customers/components/address-autocomplete.tsx
- apps/web/components/features/customers/hooks/use-address-autocomplete.ts

MODIFIED FILES:
- apps/backend/src/app.module.ts (add LocationModule)
- apps/web/components/features/customers/components/customer-form.tsx (AddressAutocomplete + INDIAN_STATES)
- apps/web/components/features/customers/hooks/index.ts (export useAddressAutocomplete)
- apps/web/components/features/customers/index.ts (export AddressAutocomplete)

ENV: Add GOOGLE_MAPS_API_KEY to apps/backend/.env
```

---

## Note

- `config.interface.ts` and `configuration.ts` already have `googleMapsApiKey`; no changes needed.
- No SMS OTP or WhatsApp changes should be included.
- `.env` may be gitignored; add the key manually if needed.
