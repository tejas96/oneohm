import { PurchaseOrderType } from '@oneohm-epc/shared/types';
import { z } from 'zod';

const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_PRICE = 100_000_000;
const MAX_TAX_RATE = 100;
const MAX_LINE_NOTES = 500;
const MAX_TERMS = 2000;
const MAX_NOTES = 2000;

export const poLineSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  orderedQuantity: z.coerce
    .number()
    .gt(0, 'Quantity must be positive')
    .max(MAX_QUANTITY, `Quantity must be ${MAX_QUANTITY.toLocaleString()} or less`),
  unitPrice: z.coerce
    .number()
    .min(0, 'Unit price must be 0 or more')
    .max(MAX_UNIT_PRICE, `Unit price must be ${MAX_UNIT_PRICE.toLocaleString()} or less`),
  taxRate: z.coerce
    .number()
    .min(0, 'Tax rate must be 0 or more')
    .max(MAX_TAX_RATE, `Tax rate must be ${MAX_TAX_RATE} or less`)
    .optional(),
  notes: z
    .string()
    .max(MAX_LINE_NOTES, `Notes must be ${MAX_LINE_NOTES} characters or less`)
    .optional(),
  /**
   * Audit flag set by the line row: 'suggested' when the unit price was
   * prefilled from the catalog and untouched; 'manual_override' when the
   * user typed or edited the price (or no catalog price existed). Never
   * shown in the UI; passed straight to the backend for variance tracking.
   */
  unitPriceSource: z.enum(['suggested', 'manual_override']).optional(),
});

export const poCreateSchema = z
  .object({
    vendorId: z.string().min(1, 'Vendor is required'),
    warehouseId: z.string().optional(),
    projectId: z.string().optional(),
    poType: z.nativeEnum(PurchaseOrderType),
    poDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    paymentTerms: z.string().max(500, 'Payment terms must be 500 characters or less').optional(),
    notes: z.string().max(MAX_NOTES, `Notes must be ${MAX_NOTES} characters or less`).optional(),
    termsConditions: z
      .string()
      .max(MAX_TERMS, `Terms & conditions must be ${MAX_TERMS} characters or less`)
      .optional(),
    items: z.array(poLineSchema).min(1, 'Add at least one line item'),
  })
  .superRefine((val, ctx) => {
    if (val.poType === PurchaseOrderType.PROJECT_SPECIFIC && !val.projectId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project is required for project-specific POs',
        path: ['projectId'],
      });
    }
    const seen = new Map<string, number>();
    for (let i = 0; i < val.items.length; i += 1) {
      const line = val.items[i];
      if (!line?.productId) continue;
      const prev = seen.get(line.productId);
      if (prev !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate product on multiple lines',
          path: ['items', i, 'productId'],
        });
      }
      seen.set(line.productId, i);
    }
  });

export type PoCreateFormValues = z.infer<typeof poCreateSchema>;

export interface PoLineComputed {
  qty: number;
  price: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export function computeLine(line: PoCreateFormValues['items'][number]): PoLineComputed {
  const qty = Number(line.orderedQuantity) || 0;
  const price = Number(line.unitPrice) || 0;
  const taxRate = Number(line.taxRate ?? 0) || 0;
  const lineSubtotal = round2(qty * price);
  const lineTax = round2(lineSubtotal * (taxRate / 100));
  const lineTotal = round2(lineSubtotal + lineTax);
  return { qty, price, taxRate, lineSubtotal, lineTax, lineTotal };
}

export interface PoTotals {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export function computeTotals(items: PoCreateFormValues['items']): PoTotals {
  const subtotal = round2(items.reduce((s, l) => s + computeLine(l).lineSubtotal, 0));
  const taxAmount = round2(items.reduce((s, l) => s + computeLine(l).lineTax, 0));
  const totalAmount = round2(subtotal + taxAmount);
  return { subtotal, taxAmount, totalAmount };
}

/**
 * Format a Date to local ISO date `YYYY-MM-DD`.
 * NEVER use `toISOString()` for DATE columns — IST→UTC shift can move the
 * date back by a day. Always use local components.
 */
export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const PO_TYPE_OPTIONS: Array<{ value: PurchaseOrderType; label: string }> = [
  { value: PurchaseOrderType.STOCK, label: 'Stock' },
  { value: PurchaseOrderType.PROJECT_SPECIFIC, label: 'Project specific' },
];
