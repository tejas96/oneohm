'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, IconButton } from '@mui/material';
import { PaymentStatus, ProductStatus, PurchaseOrderType } from '@oneohm-epc/shared/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/shared';
import { MUIInput, MUISelect } from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useResourceList, type BaseFilters } from '@/lib/hooks/core';
import {
  type ProductAdminFilters,
  type ProductAdminItem,
} from '@/lib/hooks/resources/products-admin';
import { usePurchaseOrderMutations } from '@/lib/hooks/resources/purchase-orders';
import { useVendors } from '@/lib/hooks/resources/vendors';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { getErrorMessage } from '@/lib/utils';

interface ProjectPick {
  id: string;
  name: string;
  projectNumber?: string;
}

const poLineSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  orderedQuantity: z.coerce
    .number()
    .gt(0, 'Quantity must be positive')
    .max(1_000_000, 'Quantity must be 1,000,000 or less'),
  unitPrice: z.coerce
    .number()
    .min(0, 'Unit price must be 0 or more')
    .max(100_000_000, 'Unit price must be 100,000,000 or less'),
});

const poCreateSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  warehouseId: z.string().optional(),
  projectId: z.string().optional(),
  poType: z.nativeEnum(PurchaseOrderType),
  expectedDeliveryDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(poLineSchema).min(1, 'Add at least one line item'),
});

export type PoCreateFormValues = z.infer<typeof poCreateSchema>;

const PO_TYPE_OPTIONS = [
  { value: PurchaseOrderType.STOCK, label: 'Stock' },
  { value: PurchaseOrderType.PROJECT_SPECIFIC, label: 'Project specific' },
];

export function PoCreatePage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { create } = usePurchaseOrderMutations();
  // Deep-link seed: alerts page passes ?warehouseId=&productId=&quantity=&source=low-stock-alert.
  // We only seed once; further user edits must not be overwritten by the
  // ref's stale snapshot when products/warehouses arrive late.
  const seedRef = useRef({
    warehouseId: searchParams.get('warehouseId') ?? '',
    productId: searchParams.get('productId') ?? '',
    quantity: Number(searchParams.get('quantity') ?? 0) || 0,
    seeded: false,
  });

  const { items: vendors, isLoading: vendorsLoading } = useVendors({
    syncToUrl: false,
    defaultPageSize: 200,
  });
  const { items: warehouses, isLoading: whLoading } = useWarehouses({
    syncToUrl: false,
    defaultPageSize: 200,
  });
  const { items: products, isLoading: productsLoading } = useResourceList<
    ProductAdminItem,
    ProductAdminFilters
  >({
    resource: 'products-admin',
    endpoint: '/products',
    defaultPageSize: 200,
    syncToUrl: false,
    defaultFilters: { status: ProductStatus.ACTIVE },
  });
  const { items: projects, isLoading: projectsLoading } = useResourceList<ProjectPick, BaseFilters>(
    {
      resource: 'projects',
      endpoint: '/projects',
      defaultPageSize: 200,
      syncToUrl: false,
    },
  );

  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        value: v.id,
        label: `${v.name} (${v.code})`,
      })),
    [vendors],
  );
  const warehouseOptions = useMemo(
    () => [
      { value: '', label: 'None' },
      ...warehouses.map((w) => ({ value: w.id, label: w.name })),
    ],
    [warehouses],
  );
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.code})`,
      })),
    [products],
  );
  const projectOptions = useMemo(
    () => [
      { value: '', label: 'None' },
      ...projects.map((p) => ({
        value: p.id,
        label: p.projectNumber ? `${p.projectNumber} — ${p.name}` : p.name,
      })),
    ],
    [projects],
  );

  const form = useForm<PoCreateFormValues>({
    resolver: zodResolver(poCreateSchema),
    defaultValues: {
      vendorId: '',
      warehouseId: seedRef.current.warehouseId,
      projectId: '',
      poType: PurchaseOrderType.STOCK,
      expectedDeliveryDate: '',
      paymentTerms: '',
      notes: '',
      items: [
        {
          productId: seedRef.current.productId,
          orderedQuantity: seedRef.current.quantity || 1,
          unitPrice: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  // Once products/warehouses load, validate the seeded ids resolve to
  // real options. If the seeded warehouse / product no longer exists
  // (deleted between alert and PO create), clear the field so the user
  // gets the friendly "select…" placeholder instead of an invisible id.
  useEffect(() => {
    if (seedRef.current.seeded || warehouses.length === 0 || products.length === 0) return;
    seedRef.current.seeded = true;
    if (
      seedRef.current.warehouseId &&
      !warehouses.some((w) => w.id === seedRef.current.warehouseId)
    ) {
      form.setValue('warehouseId', '');
    }
    if (seedRef.current.productId && !products.some((p) => p.id === seedRef.current.productId)) {
      form.setValue('items.0.productId', '');
    }
  }, [warehouses, products, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const itemsPayload = values.items.map((row) => {
      const qty = Number(row.orderedQuantity);
      const price = Number(row.unitPrice);
      const lineTotal = Math.round(qty * price * 100) / 100;
      return {
        productId: row.productId,
        orderedQuantity: qty,
        unitPrice: price,
        lineTotal,
      };
    });
    const subtotal = itemsPayload.reduce((s, i) => s + i.lineTotal, 0);
    const taxAmount = 0;
    const totalAmount = subtotal + taxAmount;

    const created = await create.mutateAsync({
      vendorId: values.vendorId,
      warehouseId: values.warehouseId?.trim() || undefined,
      projectId: values.projectId?.trim() || undefined,
      poType: values.poType,
      expectedDeliveryDate: values.expectedDeliveryDate?.trim() || undefined,
      paymentTerms: values.paymentTerms?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      subtotal,
      taxAmount,
      totalAmount,
      paymentStatus: PaymentStatus.PENDING,
      items: itemsPayload,
    } as Parameters<typeof create.mutateAsync>[0]);
    void router.push(`${ROUTES.INVENTORY.PURCHASE_ORDERS}/${created.id}`);
  });

  const lookupsLoading = vendorsLoading || whLoading || productsLoading || projectsLoading;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <IconButton
          aria-label="Back"
          size="small"
          onClick={() => router.push(ROUTES.INVENTORY.PURCHASE_ORDERS)}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <MUITypography variant="drawerTitle">New purchase order</MUITypography>
      </div>

      {lookupsLoading ? (
        <MUITypography variant="body" className="text-foreground-secondary">
          Loading form options…
        </MUITypography>
      ) : null}

      <form className="flex flex-col gap-6" onSubmit={(e) => void onSubmit(e)}>
        {create.error ? (
          <Alert variant="error" title="Could not create PO">
            {getErrorMessage(create.error)}
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="vendorId"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUISelect
                {...field}
                fieldLabel="Vendor"
                required
                placeholder="Select vendor"
                options={vendorOptions}
                error={fieldState.error?.message}
                displayEmpty
              />
            )}
          />
          <Controller
            name="warehouseId"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUISelect
                {...field}
                fieldLabel="Warehouse"
                placeholder="Optional"
                options={warehouseOptions}
                error={fieldState.error?.message}
                displayEmpty
              />
            )}
          />
          <Controller
            name="projectId"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUISelect
                {...field}
                fieldLabel="Project"
                placeholder="Optional"
                options={projectOptions}
                error={fieldState.error?.message}
                displayEmpty
              />
            )}
          />
          <Controller
            name="poType"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUISelect
                {...field}
                fieldLabel="PO type"
                required
                options={PO_TYPE_OPTIONS}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="expectedDeliveryDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUIInput
                {...field}
                fieldLabel="Expected delivery"
                type="date"
                error={fieldState.error?.message}
                InputLabelProps={{ shrink: true }}
              />
            )}
          />
          <Controller
            name="paymentTerms"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUIInput {...field} fieldLabel="Payment terms" error={fieldState.error?.message} />
            )}
          />
        </div>
        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <MUIInput
              {...field}
              fieldLabel="Notes"
              multiline
              minRows={2}
              error={fieldState.error?.message}
            />
          )}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <MUITypography variant="sectionTitle">Line items</MUITypography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => append({ productId: '', orderedQuantity: 1, unitPrice: 0 })}
            >
              Add line
            </Button>
          </div>
          {form.formState.errors.items?.message ? (
            <MUITypography variant="body" className="text-error">
              {form.formState.errors.items.message}
            </MUITypography>
          ) : null}
          <div className="flex flex-col gap-3">
            {fields.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-lg border border-border-light p-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
              >
                <Controller
                  name={`items.${index}.productId`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <MUISelect
                      {...field}
                      fieldLabel="Product"
                      required
                      placeholder="Select product"
                      options={productOptions}
                      error={fieldState.error?.message}
                      displayEmpty
                    />
                  )}
                />
                <Controller
                  name={`items.${index}.orderedQuantity`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <MUIInput
                      {...field}
                      fieldLabel="Quantity"
                      type="number"
                      inputProps={{ min: 0, step: 'any' }}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name={`items.${index}.unitPrice`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <MUIInput
                      {...field}
                      fieldLabel="Unit price"
                      type="number"
                      inputProps={{ min: 0, step: '0.01' }}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <IconButton
                  aria-label="Remove line"
                  size="small"
                  disabled={fields.length <= 1}
                  onClick={() => remove(index)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="contained" disabled={create.isPending}>
            Create PO
          </Button>
          <Button
            type="button"
            variant="outlined"
            onClick={() => router.back()}
            disabled={create.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
