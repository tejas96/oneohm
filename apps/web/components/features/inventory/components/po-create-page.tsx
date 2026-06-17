'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Button, Card, CardContent, CardHeader, IconButton } from '@mui/material';
import { PaymentStatus, PurchaseOrderType } from '@tejas96/shared/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import { PoCreateLineRow } from './po-create/po-create-line-row';
import {
  PO_TYPE_OPTIONS,
  computeTotals,
  formatDateOnly,
  poCreateSchema,
  round2,
  type PoCreateFormValues,
} from './po-create/po-create-schema';
import { PoCreateSummary } from './po-create/po-create-summary';
import { ProjectPicker } from './shared/project-picker';
import { VendorPicker } from './shared/vendor-picker';
import { WarehousePicker } from './shared/warehouse-picker';

import { Alert } from '@/components/shared';
import { MUIInput, MUISelect } from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { usePurchaseOrderMutations } from '@/lib/hooks/resources/purchase-orders';
import { getErrorMessage } from '@/lib/utils';

const CARD_SX = {
  borderRadius: 2,
  borderColor: 'divider',
} as const;

interface SectionCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function SectionCard({ title, action, children }: SectionCardProps): React.JSX.Element {
  return (
    <Card variant="outlined" sx={CARD_SX}>
      <CardHeader
        title={
          <MUITypography variant="sectionTitle" component="span">
            {title}
          </MUITypography>
        }
        action={action}
        sx={{ pb: 0 }}
      />
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

export function PoCreatePage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { create } = usePurchaseOrderMutations();

  // Deep-link seed: alerts page passes ?warehouseId=&productId=&quantity=&source=low-stock-alert.
  // Captured once on mount; user edits must not be overwritten by re-renders.
  const seedRef = useRef({
    warehouseId: searchParams.get('warehouseId') ?? '',
    productId: searchParams.get('productId') ?? '',
    quantity: Number(searchParams.get('quantity') ?? 0) || 0,
  });

  const today = useMemo(() => formatDateOnly(new Date()), []);

  const form = useForm<PoCreateFormValues>({
    resolver: zodResolver(poCreateSchema),
    defaultValues: {
      vendorId: '',
      warehouseId: seedRef.current.warehouseId,
      projectId: '',
      poType: PurchaseOrderType.STOCK,
      poDate: today,
      expectedDeliveryDate: '',
      paymentTerms: '',
      notes: '',
      termsConditions: '',
      items: [
        {
          productId: seedRef.current.productId,
          orderedQuantity: seedRef.current.quantity || 1,
          unitPrice: 0,
          taxRate: undefined,
          notes: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  // Watch items live to compute running totals shown in the sticky footer.
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const totals = useMemo(() => computeTotals(watchedItems ?? []), [watchedItems]);

  // Watched poDate gets forwarded to each line row as the resolver's asOf,
  // so historical / future POs price against the catalog row that was
  // active on that date (not "today").
  const watchedPoDate = useWatch({ control: form.control, name: 'poDate' });

  // PO type ↔ project: clearing on switch avoids stale ids re-failing validation.
  const watchedPoType = useWatch({ control: form.control, name: 'poType' });
  const lastPoTypeRef = useRef(watchedPoType);
  useEffect(() => {
    if (lastPoTypeRef.current !== watchedPoType) {
      lastPoTypeRef.current = watchedPoType;
      if (watchedPoType === PurchaseOrderType.STOCK) {
        form.setValue('projectId', '', { shouldValidate: true });
      }
    }
  }, [watchedPoType, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const itemsPayload = values.items.map((row) => {
      const qty = Number(row.orderedQuantity);
      const price = Number(row.unitPrice);
      const taxRate = Number(row.taxRate ?? 0);
      const lineSubtotal = round2(qty * price);
      const lineTax = round2(lineSubtotal * (taxRate / 100));
      const lineTotal = round2(lineSubtotal + lineTax);
      return {
        productId: row.productId,
        orderedQuantity: qty,
        unitPrice: price,
        taxRate: taxRate > 0 ? taxRate : undefined,
        notes: row.notes?.trim() || undefined,
        lineTotal,
        unitPriceSource: row.unitPriceSource,
      };
    });
    const totalsPayload = computeTotals(values.items);

    const created = await create.mutateAsync({
      vendorId: values.vendorId,
      warehouseId: values.warehouseId?.trim() || undefined,
      projectId: values.projectId?.trim() || undefined,
      poType: values.poType,
      poDate: values.poDate?.trim() || undefined,
      expectedDeliveryDate: values.expectedDeliveryDate?.trim() || undefined,
      paymentTerms: values.paymentTerms?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      termsConditions: values.termsConditions?.trim() || undefined,
      subtotal: totalsPayload.subtotal,
      taxAmount: totalsPayload.taxAmount,
      totalAmount: totalsPayload.totalAmount,
      paymentStatus: PaymentStatus.PENDING,
      items: itemsPayload,
    } as unknown as Parameters<typeof create.mutateAsync>[0]);
    void router.push(`${ROUTES.INVENTORY.PURCHASE_ORDERS}/${created.id}`);
  });

  const projectRequired = watchedPoType === PurchaseOrderType.PROJECT_SPECIFIC;

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

      <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
        {create.error ? (
          <Alert variant="error" title="Could not create PO">
            {getErrorMessage(create.error)}
          </Alert>
        ) : null}

        <SectionCard title="Vendor & routing">
          <div className="grid gap-4 md:grid-cols-2">
            <VendorPicker control={form.control} name="vendorId" required />
            <WarehousePicker control={form.control} name="warehouseId" />
            <ProjectPicker control={form.control} name="projectId" required={projectRequired} />
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
          </div>
        </SectionCard>

        <SectionCard title="PO details">
          <div className="grid gap-4 md:grid-cols-3">
            <Controller
              name="poDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIDatePicker
                  fieldLabel="PO date"
                  required
                  value={field.value || null}
                  onChange={(d) => field.onChange(d ? formatDateOnly(d) : '')}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="expectedDeliveryDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIDatePicker
                  fieldLabel="Expected delivery"
                  value={field.value || null}
                  onChange={(d) => field.onChange(d ? formatDateOnly(d) : '')}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="paymentTerms"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput
                  {...field}
                  fieldLabel="Payment terms"
                  placeholder="e.g. Net 30"
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Line items"
          action={
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() =>
                append({
                  productId: '',
                  orderedQuantity: 1,
                  unitPrice: 0,
                  taxRate: undefined,
                  notes: '',
                })
              }
            >
              Add line
            </Button>
          }
        >
          {form.formState.errors.items?.message ? (
            <MUITypography variant="body" className="text-error">
              {form.formState.errors.items.message}
            </MUITypography>
          ) : null}
          <div className="flex flex-col gap-3">
            {fields.map((row, index) => (
              <PoCreateLineRow
                key={row.id}
                control={form.control}
                setValue={form.setValue}
                index={index}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
                poDate={watchedPoDate}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Notes & terms">
          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUIInput
                {...field}
                value={field.value ?? ''}
                fieldLabel="Notes"
                placeholder="Internal notes for this PO"
                multiline
                minRows={3}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="termsConditions"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUIInput
                {...field}
                value={field.value ?? ''}
                fieldLabel="Terms & conditions"
                placeholder="Payment, warranty, delivery terms"
                multiline
                minRows={4}
                error={fieldState.error?.message}
              />
            )}
          />
        </SectionCard>

        <PoCreateSummary
          totals={totals}
          isPending={create.isPending}
          onCancel={() => router.back()}
        />
      </form>
    </div>
  );
}
