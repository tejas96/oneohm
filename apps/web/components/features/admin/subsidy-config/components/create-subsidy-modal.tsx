'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectType, SubsidySchemeType } from '@tejas96/shared/types';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { type JSX } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { SCHEME_TYPE_OPTIONS } from '../constants';
import { subsidyConfigSchema, type SubsidyConfigFormData } from '../schemas/subsidy-config.schema';

import { Alert, FieldLabel } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUIDatePicker,
  MUISelect,
  MUISwitch,
  Textarea,
  Typography,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import { useSubsidyConfigMutations, type SubsidyConfigItem } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface CreateSubsidyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSubsidyModal({ open, onOpenChange }: CreateSubsidyModalProps): JSX.Element {
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

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    SubsidyConfigFormData,
    Partial<SubsidyConfigItem>
  >({
    form,
    mutation: mutations.create,
    onOpenChange,
    transformPayload: (data) => ({
      ...data,
      schemeName: data.schemeName.trim(),
      schemeCode: data.schemeCode?.trim() || undefined,
      description: data.description?.trim() || undefined,
      effectiveFrom: data.effectiveFrom || undefined,
      effectiveTo: data.effectiveTo || undefined,
    }),
  });

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Create Subsidy Rule</MUIDialogTitle>
        <MUIDialogDescription>
          Define a subsidy scheme and tiered rates for a project type.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {Boolean(mutations.create.error) && (
            <Alert variant="error" appearance="minimal">
              {getErrorMessage(mutations.create.error)}
            </Alert>
          )}

          <Card>
            <CardContent className="space-y-4">
              <div>
                <Typography variant="body" className="font-semibold">
                  Scheme Setup
                </Typography>
                <Typography variant="body" color="muted" className="text-xs">
                  Define the scheme identity and eligible project type.
                </Typography>
              </div>
              <Alert variant="info" appearance="minimal">
                Use clear naming so teams can pick the correct scheme quickly.
              </Alert>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <MUIInput
                    id="scheme-name"
                    fieldLabel="Scheme Name"
                    required
                    tooltip="Name shown in subsidy selection (e.g., PM Surya Ghar)."
                    error={form.formState.errors.schemeName?.message}
                    placeholder="e.g. PM Surya Ghar"
                    {...form.register('schemeName')}
                  />
                </div>
                <div>
                  <MUIInput
                    id="scheme-code"
                    fieldLabel="Scheme Code"
                    tooltip="Optional short code (e.g., PM_SG_2024)."
                    placeholder="e.g. PM_SG_2024"
                    {...form.register('schemeCode')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Controller
                    name="schemeType"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Scheme Type"
                        required
                        tooltip="Classification of the subsidy scheme."
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={SCHEME_TYPE_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                      />
                    )}
                  />
                </div>
                <div>
                  <Controller
                    name="projectType"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Project Type"
                        required
                        tooltip="Project category eligible for the scheme."
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={Object.values(ProjectType).map((type) => ({
                          value: type,
                          label: type,
                        }))}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <MUIInput
                    id="max-kw"
                    fieldLabel="Max Subsidy kW"
                    required
                    tooltip="Maximum system size eligible for subsidy."
                    type="number"
                    step="0.01"
                    placeholder="e.g. 3"
                    error={form.formState.errors.maxSubsidyKw?.message}
                    {...form.register('maxSubsidyKw', {
                      setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <MUIInput
                    id="max-amount"
                    fieldLabel="Max Subsidy Amount"
                    tooltip="Optional cap amount for the subsidy."
                    type="number"
                    step="0.01"
                    placeholder="e.g. 78000"
                    {...form.register('maxSubsidyAmount', {
                      setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                    })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center justify-between rounded-lg border border-border-light p-3 flex-1 min-w-[220px]">
                  <Controller
                    name="requiresDcr"
                    control={form.control}
                    render={({ field }) => (
                      <MUISwitch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        label="Requires DCR"
                        description="Only DCR panels eligible"
                        tooltip="Only DCR-compliant panels qualify."
                        labelPosition="left"
                      />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border-light p-3 flex-1 min-w-[220px]">
                  <Controller
                    name="autoSplitEnabled"
                    control={form.control}
                    render={({ field }) => (
                      <MUISwitch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        label="Auto Split"
                        description="Auto split DCR/Non-DCR"
                        tooltip="Split DCR and non-DCR automatically."
                        labelPosition="left"
                      />
                    )}
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
                      <div>
                        <MUIInput
                          fieldLabel="From kW"
                          tooltip="Start of tier range."
                          type="number"
                          step="0.01"
                          placeholder="e.g. 0"
                          error={form.formState.errors.tiers?.[index]?.fromKw?.message}
                          {...form.register(`tiers.${index}.fromKw`, { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <MUIInput
                          fieldLabel="To kW"
                          tooltip="End of tier range (leave empty for open-ended)."
                          type="number"
                          step="0.01"
                          placeholder="e.g. 3"
                          error={form.formState.errors.tiers?.[index]?.toKw?.message}
                          {...form.register(`tiers.${index}.toKw`, {
                            setValueAs: (value) => (value === '' ? null : Number(value)),
                          })}
                        />
                      </div>
                      <div>
                        <MUIInput
                          fieldLabel="Rate per kW"
                          tooltip="Subsidy rate per kW in currency."
                          type="number"
                          step="0.01"
                          placeholder="e.g. 14500"
                          error={form.formState.errors.tiers?.[index]?.ratePerKw?.message}
                          {...form.register(`tiers.${index}.ratePerKw`, { valueAsNumber: true })}
                        />
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
                <div>
                  <Controller
                    name="effectiveFrom"
                    control={form.control}
                    render={({ field }) => (
                      <MUIDatePicker
                        fieldLabel="Effective From"
                        tooltip="Date when this scheme becomes active."
                        value={field.value || null}
                        onChange={(date) =>
                          field.onChange(date ? date.toISOString().slice(0, 10) : '')
                        }
                      />
                    )}
                  />
                </div>
                <div>
                  <Controller
                    name="effectiveTo"
                    control={form.control}
                    render={({ field }) => (
                      <MUIDatePicker
                        fieldLabel="Effective To"
                        tooltip="Optional end date for the scheme."
                        value={field.value || null}
                        onChange={(date) =>
                          field.onChange(date ? date.toISOString().slice(0, 10) : '')
                        }
                      />
                    )}
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
                <Controller
                  name="isActive"
                  control={form.control}
                  render={({ field }) => (
                    <MUISwitch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      label="Active"
                      description="Only active schemes are applied to quotes."
                      tooltip="Only active schemes are applied to quotes."
                      labelPosition="left"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>
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
            ) : (
              'Create Subsidy'
            )}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
