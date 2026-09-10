'use client';

import {
  type ConnectionType,
  type LeadTemperature,
  type PropertyDocument,
  type PropertyStatus,
  type PropertyType,
  type QuoteStatus,
} from '@tejas96/shared/types';

import { defineResource } from '../core';

import type { DiscomResponse } from '@/components/features/properties/hooks/use-discoms';

// ── Types ──────────────────────────────────────────────────────

interface PropertyItem {
  id: string;
  customerId: string;
  propertyCode?: string;
  propertyName?: string;
  propertyType: PropertyType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  consumerNumber?: string;
  consumerName?: string;
  currentLoad?: string;
  discomId?: string;
  discom?: DiscomResponse;
  connectionType?: ConnectionType;
  sanctionedLoad?: number;
  meterNumber?: string;
  leadTemperature: LeadTemperature;
  isPrimary: boolean;
  wantsLoan: boolean;
  status: PropertyStatus;
  notes?: string;
  documents?: PropertyDocument[];
  siteStatus?: string;
  siteVisitDone?: boolean;
  surveyDone?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  customerName?: string;
  customerPhone?: string;
  creatorName?: string;
  latestQuoteNumber?: string;
  latestQuoteStatus?: QuoteStatus;
  /**
   * The roof has no live quote and the figures above come from a voided one.
   * Show the value as history; there is deliberately no `latestQuoteStatus`.
   */
  latestQuoteVoided?: boolean;
  latestQuoteDate?: string;
  latestQuoteFinalPrice?: number;
  /**
   * Present only once the site has become a project. `contractValue` is what
   * the project is worth TODAY; `latestQuoteFinalPrice` is what its quote said
   * at signing and never moves again. Use `siteValue()` rather than picking
   * between them by hand — see lib/utils/site-value.ts.
   */
  contractValue?: number;
  quotedValue?: number;
  changeOrderValue?: number;
  latestQuoteSystemSizeKw?: number;
}

// ── Resource Registration (kept for usePropertyMutations) ────────

defineResource<PropertyItem>('properties', {
  endpoint: '/customer-properties',
  defaultPageSize: 10,
  searchDebounceMs: 550,
  minSearchLength: 2,
  syncToUrl: true,
});

// ── Hooks ──────────────────────────────────────────────────────
