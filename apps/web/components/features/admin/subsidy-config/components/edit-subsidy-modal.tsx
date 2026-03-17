'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectType, SubsidySchemeType } from '@oneohm-epc/shared/types';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { type JSX, useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { SCHEME_TYPE_OPTIONS } from '../constants';
import { subsidyConfigSchema, type SubsidyConfigFormData } from '../schemas/subsidy-config.schema';

import { Alert, FieldLabel } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Typography,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import { useSubsidyConfigMutations, type SubsidyConfigItem } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface EditSubsidyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SubsidyConfigItem | null;
}

export function EditSubsidyModal({
  open,
  onOpenChange,
  target,
}: EditSubsidyModalProps): JSX.Element {
  const mutations = useSubsidyConfigMutations();

  const form = useForm<SubsidyConfigFormData>({
    resolver: zodResolver(subsidyConfigSchema),
    mode: 'onChange',
    defaultValues: {
      schemeName: '',
      schemeCode: '',
      schemeType: SubsidySchemeType.PM_SURYA_GHAR,
      projectType: ProjectType.RESIDENTIAL,
      maxSubsidyKw: 0,
      maxSubsidyAmount: undefined,
      requiresDcr: false,
      autoSplitEnabled: false,
      tiers: [{ fromKw: 0, toKw: 1, ratePerKw: 0 }],
      effectiveFrom: '',
      effectiveTo: '',
      isActive: true,
      description: '',
    },
  });

  const tiersFieldArray = useFieldArray({ control: form.control, name: 'tiers' });

  useEffect(() => {
    if (!target) return;
    form.reset({
      schemeName: target.schemeName ?? '',
      schemeCode: target.schemeCode ?? '',
      schemeType: target.schemeType ?? SubsidySchemeType.PM_SURYA_GHAR,
      projectType: target.projectType ?? ProjectType.RESIDENTIAL,
      maxSubsidyKw: target.maxSubsidyKw ?? 0,
      maxSubsidyAmount: target.maxSubsidyAmount ?? undefined,
      requiresDcr: target.requiresDcr ?? false,
      autoSplitEnabled: target.autoSplitEnabled ?? false,
      tiers: target.tiers?.length ? target.tiers : [{ fromKw: 0, toKw: 1, ratePerKw: 0 }],
      effectiveFrom: target.effectiveFrom ?? '',
      effectiveTo: target.effectiveTo ?? '',
      isActive: target.isActive,
      description: target.description ?? '',
    });
  }, [form, target]);

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    SubsidyConfigFormData,
    { id: string; data: Partial<SubsidyConfigItem> }
  >({
    form,
    mutation: mutations.update,
    onOpenChange,
    transformPayload: (data) => ({
      id: target?.id ?? '',
      data: {
        ...data,
        schemeName: data.schemeName.trim(),
        schemeCode: data.schemeCode?.trim() || undefined,
        description: data.description?.trim() || undefined,
        effectiveFrom: data.effectiveFrom || undefined,
        effectiveTo: data.effectiveTo || undefined,
      },
    }),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Edit Subsidy Rule</DialogTitle>
          <DialogDescription>Update subsidy scheme settings and tiers.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogBody className="space-y-5 max-h-[75vh] overflow-y-auto">
            {Boolean(mutations.update.error) && (
              <Alert variant="error" appearance="minimal">
                {getErrorMessage(mutations.update.error)}
              </Alert>
            )}

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <Typography variant="body" className="font-semibold">
                    Scheme Setup
                  </Typography>
                  <Typography variant="body" color="muted" className="text-xs">
                    Update the scheme identity and eligible project type.
                  </Typography>
                </div>
                <Alert variant="info" appearance="minimal">
                  Keep names and codes consistent for reporting.
                </Alert>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="scheme-name"
                      label="Scheme Name"
                      required
                      tooltip="Name shown in subsidy selection (e.g., PM Surya Ghar)."
                    />
                    <Input
                      id="scheme-name"
                      error={form.formState.errors.schemeName?.message}
                      placeholder="e.g. PM Surya Ghar"
                      {...form.register('schemeName')}
                    />
                    {form.formState.errors.schemeName && (
                      <p className="text-xs text-error">
                        {form.formState.errors.schemeName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="scheme-code"
                      label="Scheme Code"
                      tooltip="Optional short code (e.g., PM_SG_2024)."
                    />
                    <Input
                      id="scheme-code"
                      placeholder="e.g. PM_SG_2024"
                      {...form.register('schemeCode')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Scheme Type"
                      required
                      tooltip="Classification of the subsidy scheme."
                    />
                    <Controller
                      name="schemeType"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select scheme type (e.g., PM Surya Ghar)" />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHEME_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Project Type"
                      required
                      tooltip="Project category eligible for the scheme."
                    />
                    <Controller
                      name="projectType"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project type (e.g., Residential)" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ProjectType).map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="max-kw"
                      label="Max Subsidy kW"
                      required
                      tooltip="Maximum system size eligible for subsidy."
                    />
                    <Input
                      id="max-kw"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 3"
                      error={form.formState.errors.maxSubsidyKw?.message}
                      {...form.register('maxSubsidyKw', { valueAsNumber: true })}
                    />
                    {form.formState.errors.maxSubsidyKw && (
                      <p className="text-xs text-error">
                        {form.formState.errors.maxSubsidyKw.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="max-amount"
                      label="Max Subsidy Amount"
                      tooltip="Optional cap amount for the subsidy."
                    />
                    <Input
                      id="max-amount"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 78000"
                      {...form.register('maxSubsidyAmount', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-border-light p-3 flex-1 min-w-[220px]">
                    <div>
                      <FieldLabel
                        label="Requires DCR"
                        tooltip="Only DCR-compliant panels qualify."
                      />
                      <p className="text-xs text-foreground-tertiary">Only DCR panels eligible</p>
                    </div>
                    <Switch
                      checked={form.watch('requiresDcr')}
                      onCheckedChange={(value) => form.setValue('requiresDcr', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border-light p-3 flex-1 min-w-[220px]">
                    <div>
                      <FieldLabel
                        label="Auto Split"
                        tooltip="Split DCR and non-DCR automatically."
                      />
                      <p className="text-xs text-foreground-tertiary">Auto split DCR/Non-DCR</p>
                    </div>
                    <Switch
                      checked={form.watch('autoSplitEnabled')}
                      onCheckedChange={(value) => form.setValue('autoSplitEnabled', value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="body" className="font-semibold">
                      Subsidy Tiers
                    </Typography>
                    <Typography variant="body" color="muted" className="text-xs">
                      Define contiguous kW ranges with rate per kW.
                    </Typography>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => tiersFieldArray.append({ fromKw: 0, toKw: 1, ratePerKw: 0 })}
                  >
                    <Plus className="mr-2 size-icon-sm" />
                    Add Tier
                  </Button>
                </div>

                <Alert variant="info" appearance="minimal">
                  Tiers must be continuous and cannot overlap.
                </Alert>
                <div className="space-y-3">
                  {tiersFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border border-border-light p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <FieldLabel label="From kW" tooltip="Start of tier range." />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 0"
                            error={form.formState.errors.tiers?.[index]?.fromKw?.message}
                            {...form.register(`tiers.${index}.fromKw`, { valueAsNumber: true })}
                          />
                          {form.formState.errors.tiers?.[index]?.fromKw && (
                            <p className="text-xs text-error">
                              {form.formState.errors.tiers[index]?.fromKw?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel
                            label="To kW"
                            tooltip="End of tier range (leave empty for open-ended)."
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 3"
                            error={form.formState.errors.tiers?.[index]?.toKw?.message}
                            {...form.register(`tiers.${index}.toKw`, {
                              setValueAs: (value) => (value === '' ? null : Number(value)),
                            })}
                          />
                          {form.formState.errors.tiers?.[index]?.toKw && (
                            <p className="text-xs text-error">
                              {form.formState.errors.tiers[index]?.toKw?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel
                            label="Rate per kW"
                            tooltip="Subsidy rate per kW in currency."
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 14500"
                            error={form.formState.errors.tiers?.[index]?.ratePerKw?.message}
                            {...form.register(`tiers.${index}.ratePerKw`, { valueAsNumber: true })}
                          />
                          {form.formState.errors.tiers?.[index]?.ratePerKw && (
                            <p className="text-xs text-error">
                              {form.formState.errors.tiers[index]?.ratePerKw?.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => tiersFieldArray.remove(index)}
                          disabled={tiersFieldArray.fields.length <= 1}
                        >
                          <Trash2 className="mr-2 size-icon-sm" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {form.formState.errors.tiers && (
                    <p className="text-xs text-error">{form.formState.errors.tiers.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <Typography variant="body" className="font-semibold">
                    Schedule & Notes
                  </Typography>
                  <Typography variant="body" color="muted" className="text-xs">
                    Control effective dates and visibility.
                  </Typography>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="effective-from"
                      label="Effective From"
                      tooltip="Date when this scheme becomes active."
                    />
                    <Input
                      id="effective-from"
                      type="date"
                      placeholder="YYYY-MM-DD"
                      {...form.register('effectiveFrom')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="effective-to"
                      label="Effective To"
                      tooltip="Optional end date for the scheme."
                    />
                    <Input
                      id="effective-to"
                      type="date"
                      placeholder="YYYY-MM-DD"
                      {...form.register('effectiveTo')}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor="scheme-description"
                    label="Description"
                    tooltip="Short internal notes about eligibility or rules."
                  />
                  <Textarea
                    id="scheme-description"
                    rows={3}
                    placeholder="e.g. Residential rooftop subsidy for FY 2024"
                    {...form.register('description')}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border-light p-3">
                  <div>
                    <FieldLabel
                      label="Active"
                      tooltip="Only active schemes are applied to quotes."
                    />
                    <p className="text-xs text-foreground-tertiary">
                      Only active schemes are applied to quotes.
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('isActive')}
                    onCheckedChange={(value) => form.setValue('isActive', value)}
                  />
                </div>
              </CardContent>
            </Card>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid || !target?.id}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
