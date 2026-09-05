'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MILESTONE_LIFECYCLE_SEQUENCE } from '@tejas96/shared/constants';
import {
  ChangeRequestType,
  WORKFLOW_STEP_TYPE_LABELS,
  WorkflowStepType,
  type WorkflowStep,
} from '@tejas96/shared/types';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

import {
  workflowStepSchema,
  type ChecklistItem,
  type WorkflowStepFormValues,
} from '../schemas/workflow-step.schema';
import { buildWorkflowStepPayload } from '../utils/workflow-step-payload';

import { Alert } from '@/components/shared/alerts/alert';
import { TablePagination } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import {
  useAllActiveWorkflowSteps,
  useRoles,
  useWorkflowStepMutations,
  useWorkflowSteps,
} from '@/lib/hooks/resources';

// ── Constants ──────────────────────────────────────────────────

const NONE_SENTINEL = '__none__';

const DEFAULT_MILESTONE_SUGGESTIONS = MILESTONE_LIFECYCLE_SEQUENCE;

const CHANGE_REQUEST_TYPES = Object.values(ChangeRequestType);

const WORKFLOW_STEP_TYPES = Object.values(WorkflowStepType);

// ── Page Component ─────────────────────────────────────────────

export function AdminWorkflowStepsPage(): React.JSX.Element {
  const {
    items,
    isEmpty,
    isLoading,
    isError,
    error,
    refetch,
    search,
    setSearch,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    pagination,
  } = useWorkflowSteps();

  const mutations = useWorkflowStepMutations();
  // TODO: Uncomment when role-permission mappings are configured in the IAM UI
  // const permissions = useWorkflowStepPermissions();
  const permissions = {
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canArchive: true,
    canBulkDelete: true,
  };

  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deleteConfirmation = useDeleteConfirmation<WorkflowStep>({
    mutation: mutations.remove,

    getId: (step) => step.id,
  });

  const handleEdit = useCallback((step: WorkflowStep): void => {
    setEditingStep(step);
    setIsCreating(false);
  }, []);

  const handleCreate = useCallback((): void => {
    setEditingStep(null);
    setIsCreating(true);
  }, []);

  const handleClose = useCallback((): void => {
    setEditingStep(null);
    setIsCreating(false);
  }, []);

  const activeFilterValue = useMemo((): string => {
    const val = filters.isActive;
    if (val === true) return 'active';
    if (val === false) return 'inactive';
    return 'all';
  }, [filters.isActive]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center p-4">
        <p className="text-sm text-error font-medium">Failed to load workflow steps</p>
        <p className="text-xs text-foreground-secondary mt-1">{error?.message}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Workflow Steps</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Define the standard workflow steps for solar EPC projects. Each step becomes a task when
            a new project is created.
          </p>
        </div>
        {permissions.canCreate && (
          <Button size="sm" onClick={handleCreate}>
            <Plus className="size-icon-sm mr-1" />
            Add Step
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search steps..."
            leftIcon={<Search />}
            size="sm"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'active', 'inactive'] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={activeFilterValue === tab ? 'default' : 'outline'}
              className="text-xs capitalize"
              onClick={() => {
                if (tab === 'all') {
                  setFilter('isActive', undefined);
                } else {
                  setFilter('isActive', tab === 'active');
                }
              }}
            >
              {tab}
            </Button>
          ))}
        </div>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" className="text-xs" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-e2 overflow-hidden">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {/* A filter that matches nothing is not a fresh install. Offering
                "Create First Step" there sends the admin to add a 51st step. */}
            {hasActiveFilters ? (
              <>
                <p className="text-sm text-foreground-secondary">
                  No workflow steps match this search or filter.
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground-secondary">
                  No workflow steps configured yet.
                </p>
                {permissions.canCreate && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={handleCreate}>
                    <Plus className="size-icon-sm mr-1" />
                    Create First Step
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-border-light">
              {items.map((step) => (
                <WorkflowStepRow
                  key={step.id}
                  step={step}
                  isExpanded={expandedId === step.id}
                  onToggleExpand={() => setExpandedId(expandedId === step.id ? null : step.id)}
                  onEdit={() => handleEdit(step)}
                  onToggleStatus={() => void mutations.action('toggleStatus', step.id)}
                  onDelete={() => deleteConfirmation.requestDelete(step)}
                  canUpdate={permissions.canUpdate}
                  canDelete={permissions.canDelete}
                />
              ))}
            </div>
            <TablePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.total}
              itemLabel="steps"
              variant="full"
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </>
        )}
      </div>

      {(isCreating || !!editingStep) && (
        <StepFormSheet open step={editingStep} mutations={mutations} onClose={handleClose} />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) deleteConfirmation.cancel();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Workflow Step</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">{deleteConfirmation.target?.name}</span>? Deletion is
              refused while any task uses this step, completed ones included, or while another step
              lists it as a dependency.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={deleteConfirmation.cancel}
              disabled={deleteConfirmation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteConfirmation.confirm()}
              disabled={deleteConfirmation.isPending}
            >
              {deleteConfirmation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-icon-sm animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Step Row (presentation only) ───────────────────────────────

interface WorkflowStepRowProps {
  step: WorkflowStep;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}

function WorkflowStepRow({
  step,
  isExpanded,
  onToggleExpand,
  onEdit,
  onToggleStatus,
  onDelete,
  canUpdate,
  canDelete,
}: WorkflowStepRowProps): React.JSX.Element {
  return (
    <div className="bg-background">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        {isExpanded ? (
          <ChevronDown className="size-icon-sm text-foreground-secondary shrink-0" />
        ) : (
          <ChevronRight className="size-icon-sm text-foreground-secondary shrink-0" />
        )}

        <span className="w-8 text-xs font-mono text-foreground-secondary">
          #{step.sequenceOrder}
        </span>
        <span className="font-medium text-sm flex-1">{step.name}</span>
        <Badge variant="outline" className="text-xs">
          {step.code}
        </Badge>
        {step.isSpecial ? (
          <Badge variant="warning" className="text-xs">
            Change Request
          </Badge>
        ) : null}
        {step.defaultRoleCode && (
          <Badge variant="secondary" className="text-xs">
            {step.defaultRoleCode}
          </Badge>
        )}
        {!step.isActive && (
          <Badge variant="muted" className="text-xs">
            Inactive
          </Badge>
        )}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canUpdate && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="Edit step"
                onClick={onEdit}
              >
                <Edit className="size-icon-xs" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`h-7 w-7 ${step.isActive ? 'text-success' : 'text-foreground-secondary'}`}
                aria-label={step.isActive ? 'Deactivate step' : 'Activate step'}
                onClick={onToggleStatus}
              >
                {step.isActive ? (
                  <CheckCircle2 className="size-icon-xs" />
                ) : (
                  <XCircle className="size-icon-xs" />
                )}
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-error hover:text-error"
              aria-label="Delete step"
              onClick={onDelete}
            >
              <Trash2 className="size-icon-xs" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-3 pt-0 space-y-2">
          {step.description && (
            <p className="text-xs text-foreground-secondary">{step.description}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-foreground-secondary">Type:</span> {step.type || '—'}
            </div>
            <div>
              <span className="text-foreground-secondary">Department:</span>{' '}
              {step.defaultDepartment || '—'}
            </div>
            <div>
              <span className="text-foreground-secondary">Milestone:</span>{' '}
              {step.defaultMilestoneName ?? '—'}
              {step.defaultMilestoneOrder != null ? ` (#${step.defaultMilestoneOrder})` : ''}
            </div>
            <div>
              <span className="text-foreground-secondary">Effort (days):</span>{' '}
              {step.effortDays ?? '—'}
            </div>
          </div>
          {step.dependsOnTaskCodes && step.dependsOnTaskCodes.length > 0 && (
            <div className="text-xs">
              <span className="text-foreground-secondary">Depends on: </span>
              {step.dependsOnTaskCodes.map((code) => (
                <Badge key={code} variant="outline" className="text-xs mr-1">
                  {code}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step Form Sheet ────────────────────────────────────────────

interface StepFormSheetProps {
  open: boolean;
  step: WorkflowStep | null;
  mutations: ReturnType<typeof useWorkflowStepMutations>;
  onClose: () => void;
}

function StepFormSheet({ open, step, mutations, onClose }: StepFormSheetProps): React.JSX.Element {
  const isEditing = !!step;

  const { items: allRoles, isLoading: isLoadingRoles } = useRoles({
    syncToUrl: false,
    defaultPageSize: 100,
  });
  const availableRoles = useMemo(() => {
    const seen = new Set<string>();
    // Roles were once split platform-level (null org) vs org-scoped, and this
    // list excluded the platform ones. Single-tenant has no such split, so every
    // role is offered; the Set below still de-duplicates by code.
    return allRoles.filter((r) => {
      if (seen.has(r.code)) return false;
      seen.add(r.code);
      return true;
    });
  }, [allRoles]);

  const form = useForm<WorkflowStepFormValues>({
    resolver: zodResolver(workflowStepSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      type: null,
      defaultRoleCode: '',
      defaultDepartment: '',
      defaultMilestoneName: null,
      defaultMilestoneOrder: null,
      sequenceOrder: 1,
      effortDays: '',
      isMandatory: true,
      canRunParallel: false,
      isSpecial: false,
      changeRequestType: null,
      dependsOnTaskCodes: [],
      checklistTemplate: [],
    },
  });

  useEffect(() => {
    if (!open) return;

    if (step) {
      form.reset({
        name: step.name,
        code: step.code,
        description: step.description ?? '',
        type: step.type ?? null,
        defaultRoleCode: step.defaultRoleCode ?? '',
        defaultDepartment: step.defaultDepartment ?? '',
        defaultMilestoneName: step.defaultMilestoneName ?? null,
        defaultMilestoneOrder: step.defaultMilestoneOrder ?? null,
        sequenceOrder: step.sequenceOrder,
        effortDays: step.effortDays ?? '',
        isMandatory: step.isMandatory,
        canRunParallel: step.canRunParallel,
        isSpecial: step.isSpecial ?? false,
        changeRequestType: step.changeRequestType ?? null,
        dependsOnTaskCodes: step.dependsOnTaskCodes ?? [],
        checklistTemplate:
          step.checklistTemplate?.items.map((item, idx) => ({
            id: item.id,
            title: item.title,
            isCompleted: item.isCompleted,
            order: idx,
          })) ?? [],
      });
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
        type: null,
        defaultRoleCode: '',
        defaultDepartment: '',
        defaultMilestoneName: null,
        defaultMilestoneOrder: null,
        sequenceOrder: 1,
        effortDays: '',
        isMandatory: true,
        canRunParallel: false,
        isSpecial: false,
        changeRequestType: null,
        dependsOnTaskCodes: [],
        checklistTemplate: [],
      });
    }
  }, [open, step, form]);

  const handleOpenChange = useCallback(
    (isOpen: boolean): void => {
      if (!isOpen) onClose();
    },
    [onClose],
  );

  const isPending = mutations.create.isPending || mutations.update.isPending;

  const onSubmit = useCallback(
    (data: WorkflowStepFormValues): void => {
      const payload: Partial<WorkflowStep> = buildWorkflowStepPayload(data);

      if (step) {
        mutations.update.mutate({ id: step.id, data: payload }, { onSuccess: () => onClose() });
      } else {
        mutations.create.mutate(payload, { onSuccess: () => onClose() });
      }
    },
    [step, mutations.create, mutations.update, onClose],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Workflow Step' : 'Create Workflow Step'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6 mt-4">
          {/* ─── Section: Basic Info ─── */}
          <fieldset className="space-y-4 rounded-lg shadow-e2 p-4">
            <legend className="px-2 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
              Basic Information
            </legend>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input {...form.register('name')} placeholder="e.g. Panel Installation" />
                {form.formState.errors.name && (
                  <p className="text-xs text-error">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input {...form.register('code')} placeholder="e.g. EXEC-001" />
                {form.formState.errors.code && (
                  <p className="text-xs text-error">{form.formState.errors.code.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                {...form.register('description')}
                rows={2}
                placeholder="Brief description of what this step involves..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Controller
                  name="type"
                  control={form.control}
                  render={({ field }): React.JSX.Element => {
                    // Rows predating the dropdown hold free text ("Execution",
                    // "liasioning "). Show it rather than blanking the field, so
                    // the admin can see what they are replacing.
                    const isLegacy =
                      !!field.value &&
                      !WORKFLOW_STEP_TYPES.includes(field.value as WorkflowStepType);

                    return (
                      <Select
                        value={field.value ?? NONE_SENTINEL}
                        onValueChange={(v) =>
                          field.onChange(v === NONE_SENTINEL ? null : (v as WorkflowStepType))
                        }
                      >
                        <SelectTrigger className="h-input-lg text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                          {isLegacy && (
                            <SelectItem value={field.value!} disabled>
                              {field.value} (not a standard type)
                            </SelectItem>
                          )}
                          {WORKFLOW_STEP_TYPES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {WORKFLOW_STEP_TYPE_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
                {form.formState.errors.type && (
                  <p className="text-xs text-error">{form.formState.errors.type.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Sequence Order *</Label>
                <Input type="number" {...form.register('sequenceOrder')} min={1} />
                {form.formState.errors.sequenceOrder && (
                  <p className="text-xs text-error">
                    {form.formState.errors.sequenceOrder.message}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* ─── Section: Assignment & Classification ─── */}
          <fieldset className="space-y-4 rounded-lg shadow-e2 p-4">
            <legend className="px-2 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
              Assignment & Classification
            </legend>

            <Alert variant="info" appearance="minimal" className="text-xs">
              Configure who is responsible for this step and how it is categorized. The default role
              determines which users are auto-assigned when a project is created.
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Default Role</Label>
                <Controller
                  name="defaultRoleCode"
                  control={form.control}
                  render={({ field }): React.JSX.Element => {
                    const selectValue = field.value || NONE_SENTINEL;
                    const hasStaleValue =
                      field.value &&
                      !availableRoles.some((r) => r.code === field.value) &&
                      !isLoadingRoles;

                    return (
                      <Select
                        value={selectValue}
                        onValueChange={(v) => field.onChange(v === NONE_SENTINEL ? '' : v)}
                      >
                        <SelectTrigger className="h-input-lg text-sm">
                          <SelectValue
                            placeholder={isLoadingRoles ? 'Loading...' : 'Select role'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                          {hasStaleValue && (
                            <SelectItem value={field.value!} disabled>
                              {field.value} (deleted)
                            </SelectItem>
                          )}
                          {availableRoles.map((role) => (
                            <SelectItem key={role.id} value={role.code}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input {...form.register('defaultDepartment')} placeholder="e.g. Engineering" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Default Milestone Name</Label>
                <Controller
                  name="defaultMilestoneName"
                  control={form.control}
                  render={({ field }): React.JSX.Element => (
                    <Select
                      value={field.value ?? NONE_SENTINEL}
                      onValueChange={(v) => field.onChange(v === NONE_SENTINEL ? null : v)}
                    >
                      <SelectTrigger className="h-input-lg text-sm">
                        <SelectValue placeholder="Select or leave blank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                        {DEFAULT_MILESTONE_SUGGESTIONS.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Milestone Order</Label>
                {/* No valueAsNumber: it turns an emptied box into NaN, which the
                    schema cannot read as "cleared". */}
                <Input
                  type="number"
                  {...form.register('defaultMilestoneOrder')}
                  min={0}
                  placeholder="e.g. 1"
                />
                {form.formState.errors.defaultMilestoneOrder && (
                  <p className="text-xs text-error">
                    {form.formState.errors.defaultMilestoneOrder.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Effort (days)</Label>
                <Input
                  type="number"
                  {...form.register('effortDays')}
                  min={0}
                  placeholder="e.g. 2"
                />
                {form.formState.errors.effortDays && (
                  <p className="text-xs text-error">{form.formState.errors.effortDays.message}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* ─── Section: Execution Rules ─── */}
          <fieldset className="space-y-4 rounded-lg shadow-e2 p-4">
            <legend className="px-2 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
              Execution Rules
            </legend>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md p-3 shadow-e1">
                <Checkbox
                  id="isMandatory"
                  checked={form.watch('isMandatory')}
                  onCheckedChange={(checked) => form.setValue('isMandatory', checked === true)}
                  label="Mandatory"
                  description="This step cannot be skipped during project execution."
                />
              </div>
              <div className="rounded-md p-3 shadow-e1">
                <Checkbox
                  id="canRunParallel"
                  checked={form.watch('canRunParallel')}
                  onCheckedChange={(checked) => form.setValue('canRunParallel', checked === true)}
                  label="Can run in parallel"
                  description="Allow this step to run concurrently with other steps."
                />
              </div>
            </div>
          </fieldset>

          {/* ─── Section: Change Request ─── */}
          <fieldset className="space-y-4 rounded-lg shadow-e2 p-4">
            <legend className="px-2 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
              Change Request
            </legend>

            <Alert variant="info" appearance="minimal" className="text-xs">
              A change request step is not part of a new project. It is created only when a property
              raises a request of the type you pick here, so each type can have one active step.
            </Alert>

            <div className="rounded-md p-3 shadow-e1">
              <Checkbox
                id="isSpecial"
                checked={form.watch('isSpecial')}
                onCheckedChange={(checked) => {
                  const on = checked === true;
                  form.setValue('isSpecial', on);
                  if (!on) form.setValue('changeRequestType', null);
                }}
                label="This is a change request step"
                description="Keeps it out of every new project's task list."
              />
            </div>

            {form.watch('isSpecial') && (
              <div className="space-y-1.5">
                <Label>Change Request Type *</Label>
                <Controller
                  name="changeRequestType"
                  control={form.control}
                  render={({ field }): React.JSX.Element => (
                    <Select
                      value={field.value ?? NONE_SENTINEL}
                      onValueChange={(v) =>
                        field.onChange(v === NONE_SENTINEL ? null : (v as ChangeRequestType))
                      }
                    >
                      <SelectTrigger className="h-input-lg text-sm">
                        <SelectValue placeholder="Select a request type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                        {CHANGE_REQUEST_TYPES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.changeRequestType && (
                  <p className="text-xs text-error">
                    {form.formState.errors.changeRequestType.message}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {/* ─── Section: Dependencies ─── */}
          <fieldset className="space-y-3 rounded-lg shadow-e2 p-4">
            <legend className="px-2 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
              Dependencies
            </legend>

            <Alert variant="info" appearance="minimal" className="text-xs">
              Select the workflow steps that must be completed before this step can begin. This
              creates task dependencies when projects are created.
            </Alert>

            <Controller
              name="dependsOnTaskCodes"
              control={form.control}
              render={({ field }): React.JSX.Element => (
                <DependsOnSelector
                  value={field.value ?? []}
                  onChange={field.onChange}
                  excludeCode={step?.code}
                />
              )}
            />
          </fieldset>

          {/* ─── Section: Checklist Template ─── */}
          <fieldset className="space-y-3 rounded-lg shadow-e2 p-4">
            <legend className="px-2 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
              Checklist Template
            </legend>

            <Alert variant="info" appearance="minimal" className="text-xs">
              Define checklist items that will be pre-populated when a task is created from this
              step. Assignees can check off items as they progress.
            </Alert>

            <Controller
              name="checklistTemplate"
              control={form.control}
              render={({ field }): React.JSX.Element => (
                <ChecklistBuilder value={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </fieldset>

          {/* Submit */}
          <div className="flex gap-2 pt-1 pb-4">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ── DependsOnSelector ──────────────────────────────────────────

interface DependsOnSelectorProps {
  value: string[];
  onChange: (codes: string[]) => void;
  excludeCode?: string;
}

function DependsOnSelector({
  value,
  onChange,
  excludeCode,
}: DependsOnSelectorProps): React.JSX.Element {
  const { items: allSteps, isLoading } = useAllActiveWorkflowSteps();
  const [searchTerm, setSearchTerm] = useState('');

  const selectedSet = useMemo(() => new Set(value), [value]);

  const stepsMap = useMemo(() => {
    const map = new Map<string, WorkflowStep>();
    for (const s of allSteps) {
      map.set(s.code, s);
    }
    return map;
  }, [allSteps]);

  const availableSteps = useMemo((): WorkflowStep[] => {
    const lower = searchTerm.toLowerCase();

    return allSteps.filter((s): boolean => {
      if (selectedSet.has(s.code)) return false;
      if (excludeCode && s.code === excludeCode) return false;
      if (!lower) return true;
      return s.name.toLowerCase().includes(lower) || s.code.toLowerCase().includes(lower);
    });
  }, [allSteps, searchTerm, selectedSet, excludeCode]);

  const addCode = useCallback(
    (code: string): void => onChange([...value, code]),
    [value, onChange],
  );

  const removeCode = useCallback(
    (code: string): void => onChange(value.filter((c) => c !== code)),
    [value, onChange],
  );

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-md p-2 shadow-e1">
          {value.map((code) => {
            const stepInfo = stepsMap.get(code);
            return (
              <Badge
                key={code}
                variant="secondary"
                size="xs"
                className="pr-1 cursor-pointer hover:bg-error/10 group"
                onClick={() => removeCode(code)}
              >
                {stepInfo ? stepInfo.name : code}
                <X className="ml-1 size-3 opacity-50 group-hover:opacity-100 group-hover:text-error" />
              </Badge>
            );
          })}
        </div>
      )}

      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search steps..."
        leftIcon={<Search className="size-icon-sm" />}
        size="sm"
      />

      <div className="rounded-md max-h-[200px] overflow-y-auto shadow-e1">
        {isLoading ? (
          <p className="text-sm text-foreground-tertiary p-3 text-center">Loading steps...</p>
        ) : availableSteps.length === 0 ? (
          <p className="text-sm text-foreground-tertiary p-3 text-center">
            {searchTerm ? 'No matching steps' : 'No other workflow steps available'}
          </p>
        ) : (
          <div className="divide-y divide-border-light">
            {availableSteps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addCode(s.code)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <span>{s.name}</span>
                <span className="text-[10px] text-foreground-tertiary font-mono">{s.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-foreground-tertiary">
        {value.length} dependenc{value.length !== 1 ? 'ies' : 'y'} selected
      </p>
    </div>
  );
}

// ── ChecklistBuilder ───────────────────────────────────────────

interface ChecklistBuilderProps {
  value: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

function ChecklistBuilder({ value, onChange }: ChecklistBuilderProps): React.JSX.Element {
  const addItem = useCallback((): void => {
    onChange([
      ...value,
      {
        id: uuidv4(),
        title: '',
        isCompleted: false,
        order: value.length,
      },
    ]);
  }, [value, onChange]);

  const removeItem = useCallback(
    (id: string): void => {
      onChange(
        value.filter((item) => item.id !== id).map((item, idx) => ({ ...item, order: idx })),
      );
    },
    [value, onChange],
  );

  const updateTitle = useCallback(
    (id: string, title: string): void => {
      onChange(value.map((item) => (item.id === id ? { ...item, title } : item)));
    },
    [value, onChange],
  );

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="text-xs text-foreground-tertiary">No checklist items yet</p>
      ) : (
        <div
          className={value.length > 5 ? 'max-h-[240px] overflow-y-auto space-y-1.5' : 'space-y-1.5'}
        >
          {value.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs text-foreground-tertiary w-5 text-right shrink-0">
                {idx + 1}.
              </span>
              <Input
                value={item.title}
                onChange={(e) => updateTitle(item.id, e.target.value)}
                placeholder="Checklist item..."
                size="sm"
                containerClassName="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-foreground-tertiary hover:text-error"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="size-icon-xs" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="size-icon-xs mr-1" />
        Add Item
      </Button>
    </div>
  );
}
