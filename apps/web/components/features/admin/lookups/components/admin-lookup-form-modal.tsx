'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { InputAdornment, TextField } from '@mui/material';
import { LookupDataType, LookupScopeType } from '@oneohm-epc/shared/types';
import { Loader2 } from 'lucide-react';
import { type JSX, useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { LOOKUP_DATA_TYPE_LABELS, LOOKUP_SCOPE_TYPE_LABELS } from '../constants';
import {
  type LookupFormInput,
  type LookupFormValues,
  lookupSchema,
} from '../schemas/lookup.schema';

import { Alert } from '@/components/shared';
import {
  Button,
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
  MUISwitch,
} from '@/components/ui';
import { MUIFieldLabel } from '@/components/ui/mui-shared';
import { useModalForm } from '@/lib/hooks/core';
import { useLookupMutations, type Lookup } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface AdminLookupFormModalProps {
  open: boolean;
  lookup: Lookup | null;
  onOpenChange: (open: boolean) => void;
}

const DATA_TYPE_OPTIONS = Object.values(LookupDataType).map((v) => ({
  value: v,
  label: LOOKUP_DATA_TYPE_LABELS[v],
}));

const SCOPE_TYPE_OPTIONS = Object.values(LookupScopeType).map((v) => ({
  value: v,
  label: LOOKUP_SCOPE_TYPE_LABELS[v],
  disabled: v === LookupScopeType.ORGANIZATION,
}));

function buildDefaultValues(lookup: Lookup | null): LookupFormInput {
  if (!lookup) {
    return {
      typeCode: '',
      code: '',
      label: '',
      value: undefined,
      dataType: undefined,
      scopeType: LookupScopeType.GLOBAL,
      scopeId: undefined,
      parentId: undefined,
      dependsOnId: undefined,
      orderIndex: 0,
      color: undefined,
      icon: undefined,
      isActive: true,
      metadata: undefined,
    };
  }
  return {
    typeCode: lookup.typeCode,
    code: lookup.code,
    label: lookup.label,
    value: lookup.value ?? undefined,
    dataType: lookup.dataType ?? undefined,
    scopeType: lookup.scopeType,
    scopeId: lookup.scopeId ?? undefined,
    parentId: lookup.parentId ?? undefined,
    dependsOnId: lookup.dependsOnId ?? undefined,
    orderIndex: lookup.orderIndex,
    color: lookup.color ?? undefined,
    icon: lookup.icon ?? undefined,
    isActive: lookup.isActive,
    metadata: lookup.metadata ?? undefined,
  };
}

export function AdminLookupFormModal({
  open,
  lookup,
  onOpenChange,
}: AdminLookupFormModalProps): JSX.Element {
  const isEdit = !!lookup;
  const mutations = useLookupMutations();

  const form = useForm<LookupFormInput, unknown, LookupFormValues>({
    resolver: zodResolver(lookupSchema),
    mode: 'onChange',
    defaultValues: buildDefaultValues(lookup),
  });

  // Reset form whenever the target lookup changes (create vs. edit)
  useEffect(() => {
    form.reset(buildDefaultValues(lookup));
    // Trigger validation after reset so isValid reflects actual field state
    void form.trigger();
  }, [lookup, form]);

  const scopeType = useWatch({ control: form.control, name: 'scopeType' });
  const showScopeId = scopeType === LookupScopeType.ORGANIZATION;

  // Run validation when modal opens so isValid is correct from the start
  useEffect(() => {
    if (open) void form.trigger();
  }, [open, form]);

  const buildPayload = (data: LookupFormValues): Partial<Lookup> => ({
    typeCode: data.typeCode.trim(),
    code: data.code.trim(),
    label: data.label.trim(),
    value: data.value?.trim() || undefined,
    dataType: data.dataType,
    scopeType: data.scopeType,
    scopeId: data.scopeType === LookupScopeType.ORGANIZATION ? data.scopeId : undefined,
    parentId: data.parentId || undefined,
    dependsOnId: data.dependsOnId || undefined,
    orderIndex: data.orderIndex ?? 0,
    color: data.color?.trim() || undefined,
    icon: data.icon?.trim() || undefined,
    isActive: data.isActive,
    metadata: data.metadata,
  });

  const createForm = useModalForm<LookupFormInput, Partial<Lookup>, LookupFormValues>({
    form,
    mutation: mutations.create,
    onOpenChange,
    transformPayload: buildPayload,
  });

  const editForm = useModalForm<
    LookupFormInput,
    { id: string; data: Partial<Lookup> },
    LookupFormValues
  >({
    form,
    mutation: mutations.update,
    onOpenChange,
    transformPayload: (data) => ({
      id: lookup?.id ?? '',
      data: buildPayload(data),
    }),
  });

  const { handleSubmit, handleClose, isSubmitting } = isEdit ? editForm : createForm;

  const mutationError = isEdit ? mutations.update.error : mutations.create.error;

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="default">
      <MUIDialogHeader>
        <MUIDialogTitle>{isEdit ? 'Edit Lookup' : 'Add Lookup'}</MUIDialogTitle>
        <MUIDialogDescription>
          {isEdit
            ? 'Update the details of this lookup entry.'
            : 'Add a new lookup entry for use in dropdowns and configuration.'}
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {Boolean(mutationError) && (
            <Alert variant="error" appearance="minimal">
              {getErrorMessage(mutationError)}
            </Alert>
          )}

          {/* Core identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MUIInput
              id="lookup-type-code"
              fieldLabel="Type Code"
              required
              tooltip='Lowercase snake_case group key, e.g. "lead_source". All entries sharing a type code form one dropdown.'
              placeholder="e.g. lead_source"
              error={form.formState.errors.typeCode?.message}
              disabled={isEdit}
              {...form.register('typeCode')}
            />
            <MUIInput
              id="lookup-code"
              fieldLabel="Code"
              required
              tooltip='Unique value within the type, e.g. "referral".'
              placeholder="e.g. referral"
              error={form.formState.errors.code?.message}
              {...form.register('code')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MUIInput
              id="lookup-label"
              fieldLabel="Label"
              required
              tooltip="Human-readable text shown in dropdowns."
              placeholder="e.g. Referral"
              error={form.formState.errors.label?.message}
              {...form.register('label')}
            />
            <MUIInput
              id="lookup-value"
              fieldLabel="Value"
              tooltip="Optional stored value (defaults to code if omitted)."
              placeholder="e.g. referral"
              error={form.formState.errors.value?.message}
              {...form.register('value')}
            />
          </div>

          {/* Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="scopeType"
              control={form.control}
              render={({ field }) => (
                <MUISelect
                  id="lookup-scope-type"
                  fieldLabel="Scope Type"
                  required
                  tooltip="Global entries are available everywhere. Organization entries are scoped to one org."
                  options={SCOPE_TYPE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={form.formState.errors.scopeType?.message}
                />
              )}
            />

            {showScopeId && (
              <MUIInput
                id="lookup-scope-id"
                fieldLabel="Scope ID (Organization UUID)"
                required
                tooltip="UUID of the organization this lookup is scoped to."
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                error={form.formState.errors.scopeId?.message}
                {...form.register('scopeId')}
              />
            )}
          </div>

          {/* Data type + order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="dataType"
              control={form.control}
              render={({ field }) => (
                <MUISelect
                  id="lookup-data-type"
                  fieldLabel="Data Type"
                  tooltip="Describes the type of the stored value for validation and display."
                  options={DATA_TYPE_OPTIONS}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Select data type"
                  error={form.formState.errors.dataType?.message}
                />
              )}
            />
            <MUIInput
              id="lookup-order-index"
              fieldLabel="Order"
              tooltip="Display order in dropdowns — lower numbers appear first."
              placeholder="0"
              type="number"
              error={form.formState.errors.orderIndex?.message}
              {...form.register('orderIndex')}
            />
          </div>

          {/* UI hints */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="color"
              control={form.control}
              render={({ field }) => {
                const swatchRef = useRef<HTMLInputElement>(null);
                // Normalize: empty string → undefined, fallback swatch to #000000
                const hexValue = field.value ?? '';
                const swatchColor = /^#[0-9a-fA-F]{6}$/.test(hexValue) ? hexValue : '#000000';
                return (
                  <div>
                    <MUIFieldLabel
                      fieldLabel="Color"
                      tooltip='Optional hex color for UI rendering, e.g. "#4CAF50".'
                      htmlFor="lookup-color"
                    />
                    {/* Hidden native color picker — opened by clicking the swatch adornment */}
                    <input
                      ref={swatchRef}
                      type="color"
                      value={swatchColor}
                      onChange={(e) => field.onChange(e.target.value)}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        pointerEvents: 'none',
                        width: 0,
                        height: 0,
                      }}
                      tabIndex={-1}
                    />
                    <TextField
                      id="lookup-color"
                      size="small"
                      fullWidth
                      placeholder="#4CAF50"
                      value={hexValue}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                      error={Boolean(form.formState.errors.color)}
                      helperText={form.formState.errors.color?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <button
                              type="button"
                              aria-label="Pick colour"
                              onClick={() => swatchRef.current?.click()}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                border: '1px solid rgba(0,0,0,0.2)',
                                background: swatchColor,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </div>
                );
              }}
            />
            <MUIInput
              id="lookup-icon"
              fieldLabel="Icon"
              tooltip="Optional icon name from @mui/icons-material."
              placeholder="e.g. TrendingUp"
              error={form.formState.errors.icon?.message}
              {...form.register('icon')}
            />
          </div>

          {/* Active toggle */}
          <div className="border border-border-light rounded-lg px-4 py-3">
            <Controller
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <MUISwitch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  label="Active"
                  description="Inactive entries are hidden from dropdowns and selection fields."
                  labelPosition="left"
                />
              )}
            />
          </div>
        </MUIDialogBody>

        <MUIDialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Add Lookup'
            )}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
