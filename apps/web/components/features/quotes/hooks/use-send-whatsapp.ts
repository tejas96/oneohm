'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { QuoteDetail } from './types';
import { generateSimplePdfBlob } from '../services/quote-pdf.service';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

export interface SendWhatsAppInput {
  quoteId: string;
  phone: string;
}

export interface SendWhatsAppResult {
  messageId: string;
}

interface StoragePresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresAt: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Full pipeline for sending a quotation PDF via WhatsApp.
 *
 * Steps performed inside the mutation:
 * 1. Fetch full quote detail (customer, pricing, line items)
 * 2. Generate PDF Blob client-side using html2pdf.js
 * 3. Get a presigned S3 upload URL from the storage API
 * 4. Upload the PDF blob directly to Tigris/S3
 * 5. Call the WhatsApp backend endpoint with the public PDF URL
 */
export function useSendWhatsApp(): UseMutationResult<
  SendWhatsAppResult,
  AxiosError | Error,
  SendWhatsAppInput
> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ quoteId, phone }: SendWhatsAppInput): Promise<SendWhatsAppResult> => {
      const headers = { 'X-Organization-Id': organizationId };

      // ── Step 1: Fetch full quote detail ──────────────────────────────────
      const { data: detail } = await apiClient.get<QuoteDetail>(`/quotes/${quoteId}`, {
        headers,
      });

      // ── Step 2: Generate PDF blob ─────────────────────────────────────────
      const pdfBlob = await generateSimplePdfBlob(detail);

      // ── Step 3: Get presigned upload URL ──────────────────────────────────
      const filename = `Quotation-${detail.quoteNumber}.pdf`;
      const { data: presigned } = await apiClient.post<StoragePresignedUrlResponse>(
        '/storage/presigned-url',
        {
          fileName: filename,
          contentType: 'application/pdf',
          fileSize: pdfBlob.size,
          category: 'quote',
          entityId: quoteId,
          subCategory: 'whatsapp',
        },
        { headers },
      );

      // Guard: ensure publicUrl is a clean URL with no extra data
      const cleanPublicUrl = presigned.publicUrl.trim();
      console.log('[WhatsApp] presigned.publicUrl:', JSON.stringify(cleanPublicUrl));

      // ── Step 4: Upload PDF to Tigris/S3 (public-read so WhatsApp can download it) ──
      const uploadResponse = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        body: pdfBlob,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(pdfBlob.size),
          'x-amz-acl': 'public-read',
        },
      });

      if (!uploadResponse.ok) {
        const body = await uploadResponse.text().catch(() => '');
        throw new Error(`PDF upload to storage failed (${uploadResponse.status} ${uploadResponse.statusText}): ${body}`);
      }

      // ── Step 5: Send WhatsApp via backend ─────────────────────────────────
      const customerName = detail.customerName ?? 'Customer';
      const { data: result } = await apiClient.post<SendWhatsAppResult>(
        '/whatsapp/send-quotation',
        {
          phone,
          quotationId: quoteId,
          pdfUrl: cleanPublicUrl,
          quoteNumber: detail.quoteNumber,
          customerName,
          validUntil: detail.validUntil,
        },
        { headers },
      );

      return result;
    },
  });
}
