# WhatsApp Cloud API Integration — Change Log

**Feature:** Send Quotation PDF to Customer via WhatsApp from the Quotation Listing Page  
**Date:** March 2026  
**WhatsApp Phone Number ID:** 998829833320440  
**API Version:** Graph API v19.0

---

## Overview

When a user clicks **"Send WhatsApp"** on the quotation listing page, the following pipeline runs:

```
Quote List Page  →  useSendWhatsApp hook  →  5-step pipeline
  1. Fetch full quote detail from backend
  2. Generate PDF Blob in browser (html2pdf.js)
  3. Get presigned upload URL from Tigris/S3
  4. Upload PDF to Tigris (public-read)
  5. POST /whatsapp/send-quotation → WhatsApp Cloud API
```

The customer receives the quotation as a **WhatsApp document message** with a caption.

---

## Backend Changes

### New Files

#### `apps/backend/src/modules/whatsapp/whatsapp.module.ts`
NestJS module registration. Declares `WhatsAppController` and `WhatsAppService`.

```
modules/whatsapp/
├── whatsapp.module.ts
├── controllers/
│   └── whatsapp.controller.ts
├── services/
│   └── whatsapp.service.ts
└── dto/
    └── send-quotation-whatsapp.dto.ts
```

---

#### `apps/backend/src/modules/whatsapp/controllers/whatsapp.controller.ts`
REST controller. Exposes one endpoint:

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/v1/whatsapp/send-quotation` | JWT Bearer | Sends quotation PDF to customer WhatsApp |

**Request Body:**
```json
{
  "phone": "919876543210",
  "quotationId": "uuid",
  "pdfUrl": "https://proud-feather-6833.fly.storage.tigris.dev/quote/...",
  "quoteNumber": "QT-ONEOHM-2025-0001",
  "customerName": "Rajesh Sharma",
  "validUntil": "2025-02-15"
}
```

**Response:**
```json
{ "messageId": "wamid.xxxxxxxxxxxx" }
```

---

#### `apps/backend/src/modules/whatsapp/services/whatsapp.service.ts`
Core business logic. Reads `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` from config, then calls:

```
POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
```

Sends a **document message** with:
- `link` → public Tigris URL of the PDF
- `filename` → `Quotation-{quoteNumber}.pdf`
- `caption` → personalised message with customer name and validity date

---

#### `apps/backend/src/modules/whatsapp/dto/send-quotation-whatsapp.dto.ts`
Input validation DTO. Validates:
- `phone` — 10–15 digits, no `+` prefix, no spaces
- `quotationId` — valid UUID
- `pdfUrl` — non-empty string (public Tigris URL)
- `quoteNumber`, `customerName`, `validUntil` — non-empty strings

---

### Modified Files

#### `apps/backend/src/app.module.ts`
Added `WhatsAppModule` to the imports array.

```diff
+ import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';

  imports: [
    ...
+   WhatsAppModule,
  ]
```

---

#### `apps/backend/src/config/config.interface.ts`
Added two new fields to `IntegrationsConfig`:

```diff
  export interface IntegrationsConfig {
    encryptionKey?: string;
    msg91AuthKey?: string;
    msg91SenderId?: string;
    msg91DltTemplateId?: string;
+   whatsappAccessToken?: string;
+   whatsappPhoneNumberId?: string;
  }
```

---

#### `apps/backend/src/config/configuration.ts`
Mapped the new env vars in the `integrations` block:

```diff
  integrations: {
    ...
+   whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
+   whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  },
```

---

#### `apps/backend/.env`
Added live credentials (not committed to git):

```env
WHATSAPP_ACCESS_TOKEN=EAAR4PZA8tdS4BQ4hgly...
WHATSAPP_PHONE_NUMBER_ID=998829833320440
FRONTEND_URL=http://localhost:3001
```

---

#### `apps/backend/.env.example`
Documented the new variables for other developers:

```env
# WhatsApp Cloud API
# Get from https://developers.facebook.com > WhatsApp > API Setup
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

---

#### `apps/backend/src/modules/storage/services/s3-storage.service.ts`
Added `uploadBuffer()` method for direct server-side uploads (future use):

```typescript
async uploadBuffer(
  fileKey: string,
  body: Buffer,
  contentType: string,
  acl: 'public-read' | 'private' = 'public-read',
): Promise<{ fileKey: string; publicUrl: string }>
```

---

#### `apps/backend/src/modules/storage/services/storage.service.ts`
Added `uploadBuffer()` convenience wrapper that delegates to `S3StorageService`:

```typescript
async uploadBuffer(
  fileKey: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ fileKey: string; publicUrl: string }>
```

---

#### `apps/backend/src/modules/storage/storage.module.ts`
Exported `S3StorageService` alongside `StorageService`:

```diff
- exports: [StorageService],
+ exports: [StorageService, S3StorageService],
```

---

## Frontend Changes

### New Files

#### `apps/web/components/features/quotes/hooks/use-send-whatsapp.ts`
TanStack Query mutation hook. Runs the complete 5-step pipeline on mutation fire:

1. `GET /quotes/:quoteId` — fetch full quote detail (pricing, line items, customer info)
2. `generateSimplePdfBlob(detail)` — generate PDF Blob using `html2pdf.js`
3. `POST /storage/presigned-url` — get Tigris presigned upload URL
4. `PUT presignedUrl` — upload PDF blob directly to Tigris (`public-read`)
5. `POST /whatsapp/send-quotation` — send via backend to WhatsApp Cloud API

**Input:**
```typescript
interface SendWhatsAppInput {
  quoteId: string;
  phone: string;
}
```

**Output:**
```typescript
interface SendWhatsAppResult {
  messageId: string;
}
```

---

#### `apps/web/components/features/quotes/services/quote-simple-pdf.template.ts`
HTML template function that generates a complete, professionally styled quotation HTML page from a `QuoteDetail` object. Includes:

- Header with One Ohm EPC branding (navy + solar orange)
- Customer info box (name, phone, email, property)
- System details grid (system type, size, project type)
- Line items table (item name, qty, unit price, GST %, total)
- Pricing summary with subsidy/discount deductions
- Final amount highlighted box
- Payment schedule milestones
- Footer with terms note

---

### Modified Files

#### `apps/web/components/features/quotes/services/quote-pdf.service.ts`
Added `generateSimplePdfBlob()` function (alongside the existing `generateAndDownloadPdf`):

```typescript
export async function generateSimplePdfBlob(detail: QuoteDetail): Promise<Blob>
```

Uses `html2pdf().output('blob')` instead of `.save()` to return a `Blob` for upload rather than triggering a download.

---

#### `apps/web/components/features/quotes/hooks/use-quotes.ts`
Added `customerPhone` to the `QuoteListItem` interface:

```diff
  export interface QuoteListItem {
    id: string;
    ...
    customerName?: string;
+   customerPhone?: string;
    propertyId?: string;
    ...
  }
```

---

#### `apps/web/components/features/quotes/hooks/index.ts`
Exported the new hook from the barrel:

```diff
  export { useQuotePdf } from './use-quote-pdf';
+ export { useSendWhatsApp } from './use-send-whatsapp';
```

---

#### `apps/web/components/features/quotes/components/quote-list-page.tsx`
Four changes:

1. **Import** — added `MessageSquare` icon from `lucide-react`
2. **Import** — added `useSendWhatsApp` from `../hooks`
3. **Mutation** — initialised `sendWhatsAppMutation = useSendWhatsApp()`
4. **Handler** — added `handleSendWhatsApp(quote)` callback that strips non-digit characters from phone and fires the mutation
5. **Column** — added "Send WhatsApp" menu item inside the actions `DropdownMenu` with:
   - Spinner (`Loader2`) while pending, `MessageSquare` icon otherwise
   - Label changes to "Sending…" while in-flight
   - Disabled while mutation is pending
   - Error toast if `customerPhone` is not available

```tsx
<DropdownMenuItem
  onClick={() => handleSendWhatsApp(quote)}
  disabled={sendWhatsAppMutation.isPending}
>
  {sendWhatsAppMutation.isPending
    ? <Loader2 className="mr-2 size-icon-sm animate-spin" />
    : <MessageSquare className="mr-2 size-icon-sm text-success" />}
  {sendWhatsAppMutation.isPending ? 'Sending…' : 'Send WhatsApp'}
</DropdownMenuItem>
```

---

## Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `WHATSAPP_ACCESS_TOKEN` | `apps/backend/.env` | WhatsApp Cloud API permanent/temporary token |
| `WHATSAPP_PHONE_NUMBER_ID` | `apps/backend/.env` | WhatsApp phone number ID from Meta Developer Console |
| `FRONTEND_URL` | `apps/backend/.env` | Base URL of the Next.js frontend (used in captions) |

---

## WhatsApp Business Account Details

| Field | Value |
|-------|-------|
| Phone Number ID | `998829833320440` |
| Business Account ID | `916235034352387` |
| API Version | `v19.0` |
| Message Type | `document` |

---

## Files Changed — Summary Table

| # | File | Type | Change |
|---|------|------|--------|
| 1 | `apps/backend/src/modules/whatsapp/whatsapp.module.ts` | **New** | Module declaration |
| 2 | `apps/backend/src/modules/whatsapp/controllers/whatsapp.controller.ts` | **New** | `POST /whatsapp/send-quotation` endpoint |
| 3 | `apps/backend/src/modules/whatsapp/services/whatsapp.service.ts` | **New** | WhatsApp Cloud API caller |
| 4 | `apps/backend/src/modules/whatsapp/dto/send-quotation-whatsapp.dto.ts` | **New** | Input validation DTO |
| 5 | `apps/backend/src/app.module.ts` | **Modified** | Register `WhatsAppModule` |
| 6 | `apps/backend/src/config/config.interface.ts` | **Modified** | Add `whatsappAccessToken`, `whatsappPhoneNumberId` |
| 7 | `apps/backend/src/config/configuration.ts` | **Modified** | Map env vars to config |
| 8 | `apps/backend/.env` | **Modified** | Add live credentials |
| 9 | `apps/backend/.env.example` | **Modified** | Document new env vars |
| 10 | `apps/backend/src/modules/storage/services/s3-storage.service.ts` | **Modified** | Add `uploadBuffer()` method |
| 11 | `apps/backend/src/modules/storage/services/storage.service.ts` | **Modified** | Add `uploadBuffer()` wrapper |
| 12 | `apps/backend/src/modules/storage/storage.module.ts` | **Modified** | Export `S3StorageService` |
| 13 | `apps/web/components/features/quotes/hooks/use-send-whatsapp.ts` | **New** | 5-step pipeline mutation hook |
| 14 | `apps/web/components/features/quotes/services/quote-simple-pdf.template.ts` | **New** | HTML template from `QuoteDetail` |
| 15 | `apps/web/components/features/quotes/services/quote-pdf.service.ts` | **Modified** | Add `generateSimplePdfBlob()` |
| 16 | `apps/web/components/features/quotes/hooks/use-quotes.ts` | **Modified** | Add `customerPhone` to `QuoteListItem` |
| 17 | `apps/web/components/features/quotes/hooks/index.ts` | **Modified** | Export `useSendWhatsApp` |
| 18 | `apps/web/components/features/quotes/components/quote-list-page.tsx` | **Modified** | Add "Send WhatsApp" button with loading state |

**Total: 4 new files (backend) + 2 new files (frontend) + 12 modified files**
