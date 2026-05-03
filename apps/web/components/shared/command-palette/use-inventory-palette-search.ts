'use client';

import type { SvgIconComponent } from '@mui/icons-material';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import { useMemo } from 'react';

import { ROUTES } from '@/lib/config/routes';
import {
  useInventorySearch,
  type InventorySearchHit,
  type InventorySearchType,
} from '@/lib/hooks/resources';
import { useAuth } from '@/providers/auth-provider';

/**
 * Adapter on top of `useInventorySearch` (Part 12) that shapes the
 * federated results for the command palette: stable per-type group
 * order, an MUI icon per type, a precomputed href, and a single
 * `enabled` switch driven by the user's `inventory:search` permission
 * + the palette's open state.
 *
 * Why this lives next to the palette and not inside the FDAL: the
 * shape (icon, group label, href) is purely a UI concern and would
 * pollute the FDAL barrel with palette-specific types. Other inventory
 * search consumers (e.g. an autocomplete on a future page) will reuse
 * `useInventorySearch` directly with a different presentation.
 *
 * Routing rules:
 *   - vendor / warehouse / purchase-order / dispatch hits route to
 *     their detail pages via the `INVENTORY.*_DETAIL` routes;
 *   - product hits route to `/admin/products?search=<label>` because
 *     there is no per-product detail page (products are admin-managed
 *     templates).
 */

export type InventoryPaletteHit = InventorySearchHit & {
  /** MUI icon to render in the palette row. */
  icon: SvgIconComponent;
  /** Pre-built href for `router.push`; never rendered as plain text. */
  href: string;
};

export interface InventoryPaletteGroup {
  type: InventorySearchType;
  /** Heading rendered above the group. */
  label: string;
  /** Pre-rendered hits with icon + href. */
  hits: InventoryPaletteHit[];
}

export interface UseInventoryPaletteSearchResult {
  /** True only when the user can hit `/inventory/search`. */
  isEnabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** True when the user typed but the trimmed input is below 2 chars. */
  isBelowMinLength: boolean;
  /** One entry per non-empty bucket, ordered as listed below. */
  groups: InventoryPaletteGroup[];
  /** Buckets that the backend reported as failed/timed-out. */
  degraded: InventorySearchType[];
  /** Trimmed + debounced query string the hook last sent. */
  effectiveQuery: string;
}

const TYPE_LABEL: Record<InventorySearchType, string> = {
  product: 'Products',
  vendor: 'Vendors',
  warehouse: 'Warehouses',
  'purchase-order': 'Purchase Orders',
  dispatch: 'Dispatches',
};

const TYPE_ICON: Record<InventorySearchType, SvgIconComponent> = {
  product: Inventory2RoundedIcon,
  vendor: StorefrontRoundedIcon,
  warehouse: WarehouseRoundedIcon,
  'purchase-order': ReceiptLongRoundedIcon,
  dispatch: LocalShippingRoundedIcon,
};

// Stable group ordering — keeps the palette layout predictable.
const GROUP_ORDER: ReadonlyArray<InventorySearchType> = [
  'purchase-order',
  'dispatch',
  'vendor',
  'warehouse',
  'product',
];

/**
 * Build a detail-page href for an inventory search hit.
 *
 * We bypass the generic `buildRoute<T>(path, params)` helper here
 * because the inventory detail routes (warehouse / vendor / PO /
 * dispatch detail) are not registered in `RouteParamTypes`, so the
 * helper narrows their `params` to `undefined`. Pretty-printing the
 * `[id]` placeholder by hand keeps the call site fully typed without
 * touching the central route config (which would broaden this PR's
 * scope to several unrelated callers).
 */
function fillId(template: string, id: string): string {
  return template.replace('[id]', encodeURIComponent(id));
}

function hrefForHit(hit: InventorySearchHit): string {
  switch (hit.type) {
    case 'vendor':
      return fillId(ROUTES.INVENTORY.VENDOR_DETAIL, hit.id);
    case 'warehouse':
      return fillId(ROUTES.INVENTORY.WAREHOUSE_DETAIL, hit.id);
    case 'purchase-order':
      return fillId(ROUTES.INVENTORY.PURCHASE_ORDER_DETAIL, hit.id);
    case 'dispatch':
      return fillId(ROUTES.INVENTORY.DISPATCH_DETAIL, hit.id);
    case 'product': {
      // No detail page; surface the result on the products list with
      // the label pre-filled so the user can verify the match.
      const params = new URLSearchParams({ search: hit.label });
      return `${ROUTES.ADMIN.PRODUCTS}?${params.toString()}`;
    }
    default:
      return '#';
  }
}

export interface UseInventoryPaletteSearchOptions {
  /** Raw user input from the palette's text field. */
  query: string;
  /** True only while the palette dialog is open — gates the request. */
  open: boolean;
}

export function useInventoryPaletteSearch(
  opts: UseInventoryPaletteSearchOptions,
): UseInventoryPaletteSearchResult {
  const { hasPermission } = useAuth();
  const canSearch = hasPermission('inventory:search');

  const { query, effectiveQuery, isBelowMinLength } = useInventorySearch({
    query: opts.query,
    enabled: opts.open && canSearch,
  });

  const groups = useMemo<InventoryPaletteGroup[]>(() => {
    const data = query.data;
    if (!data) return [];

    const byType = new Map<InventorySearchType, InventoryPaletteHit[]>();
    for (const hit of data.hits) {
      const enriched: InventoryPaletteHit = {
        ...hit,
        icon: TYPE_ICON[hit.type],
        href: hrefForHit(hit),
      };
      const list = byType.get(hit.type);
      if (list) {
        list.push(enriched);
      } else {
        byType.set(hit.type, [enriched]);
      }
    }

    const result: InventoryPaletteGroup[] = [];
    for (const type of GROUP_ORDER) {
      const hits = byType.get(type);
      if (hits && hits.length > 0) {
        result.push({ type, label: TYPE_LABEL[type], hits });
      }
    }
    return result;
  }, [query.data]);

  return {
    isEnabled: canSearch,
    isLoading: query.isLoading,
    isError: query.isError,
    isBelowMinLength,
    groups,
    degraded: query.data?.degraded ?? [],
    effectiveQuery,
  };
}
