'use client';

import { ProjectPriority } from '@tejas96/shared/types';
import type { UseFormReturn } from 'react-hook-form';

import { PROJECT_PRIORITY_LABELS } from '../constants';
import type { ProjectEditFormData } from '../schemas/project-edit.schema';

import { MUIDatePicker, MUIInput, MUISelect } from '@/components/ui';

// ── Helpers ────────────────────────────────────────────────────

/** Format using local calendar date to avoid UTC timezone shift. */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

// ── Props ──────────────────────────────────────────────────────

interface ProjectDetailsFormProps {
  form: UseFormReturn<ProjectEditFormData>;
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export function ProjectDetailsForm({
  form,
  disabled = false,
}: ProjectDetailsFormProps): React.JSX.Element {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;

  const name = watch('name');
  const priority = watch('priority');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const description = watch('description');
  const originalStartDate = watch('originalStartDate');

  const priorityOptions = Object.values(ProjectPriority).map((p) => ({
    value: p,
    label: PROJECT_PRIORITY_LABELS[p] ?? p,
  }));

  // Minimum allowed start date: the original start date if one exists, otherwise no min.
  // This prevents moving the start date earlier than what's already persisted.
  const minStartDate = originalStartDate ? parseLocalDate(originalStartDate) : undefined;

  // Minimum allowed end date: whichever of (selected start date, original start date) is later.
  const minEndDate = startDate
    ? parseLocalDate(startDate)
    : originalStartDate
      ? parseLocalDate(originalStartDate)
      : undefined;

  function handleStartDateChange(date: Date | null): void {
    const iso = date ? toIsoDate(date) : '';
    setValue('startDate', iso, { shouldValidate: true });
    // Auto-push end date forward only if it's now strictly before the new start date
    if (iso && endDate && endDate < iso) {
      setValue('endDate', iso, { shouldValidate: true });
    }
  }

  function handleEndDateChange(date: Date | null): void {
    setValue('endDate', date ? toIsoDate(date) : '', { shouldValidate: true });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Project Name */}
      <MUIInput
        fieldLabel="Project Name"
        value={name ?? ''}
        onChange={(e) => setValue('name', e.target.value, { shouldValidate: true })}
        error={errors.name?.message}
        placeholder="e.g. Smith - Residential - 5kW"
        fullWidth
        disabled={disabled}
        required
      />

      {/* Priority */}
      <MUISelect
        fieldLabel="Priority"
        value={priority ?? ProjectPriority.NORMAL}
        onChange={(e) =>
          setValue('priority', e.target.value as ProjectPriority, { shouldValidate: true })
        }
        options={priorityOptions}
        error={errors.priority?.message}
        fullWidth
        disabled={disabled}
      />

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <MUIDatePicker
          fieldLabel="Start Date"
          value={startDate || null}
          onChange={handleStartDateChange}
          minDate={minStartDate}
          error={errors.startDate?.message}
          disabled={disabled}
        />
        <MUIDatePicker
          fieldLabel="End Date"
          value={endDate || null}
          onChange={handleEndDateChange}
          minDate={minEndDate}
          error={errors.endDate?.message}
          disabled={disabled}
        />
      </div>

      {/* Description */}
      <MUIInput
        fieldLabel="Description"
        value={description ?? ''}
        onChange={(e) => setValue('description', e.target.value)}
        placeholder="Brief description of the project scope…"
        multiline
        rows={3}
        fullWidth
        disabled={disabled}
        error={errors.description?.message}
      />
    </div>
  );
}
