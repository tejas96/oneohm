'use client';

import type { TaskStatus } from '@oneohm-epc/shared-types';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';


import { TASK_STATUS_LABELS } from '../constants';
import {
  useWorkflowSteps,
  useToggleWorkflowStep,
  useDeleteWorkflowStep,
  useSaveWorkflowStep,
  type WorkflowStep,
} from '../hooks';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/utils';

export function ProjectWorkflowStepsPage(): React.JSX.Element {
  const { data: steps, isLoading, error, refetch } = useWorkflowSteps();

  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleMutation = useToggleWorkflowStep();
  const deleteMutation = useDeleteWorkflowStep();

  const handleEdit = useCallback((step: WorkflowStep) => {
    setEditingStep(step);
    setIsCreating(false);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingStep(null);
    setIsCreating(true);
  }, []);

  const handleClose = useCallback(() => {
    setEditingStep(null);
    setIsCreating(false);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center p-6">
        <p className="text-sm text-error font-medium">Failed to load workflow steps</p>
        <p className="text-xs text-foreground-secondary mt-1">{getErrorMessage(error)}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Workflow Steps</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Define the standard workflow steps for solar EPC projects.
            Each step becomes a task when a new project is created.
          </p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Step
        </Button>
      </div>

      {!steps || steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-foreground-secondary">No workflow steps configured yet.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Create First Step
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {steps.map((step) => (
            <div key={step.id} className="border rounded-lg bg-background">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(expandedId === step.id ? null : step.id)}
              >
                {expandedId === step.id ? (
                  <ChevronDown className="h-4 w-4 text-foreground-secondary shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-foreground-secondary shrink-0" />
                )}

                <span className="w-8 text-xs font-mono text-foreground-secondary">
                  #{step.sequenceOrder}
                </span>
                <span className="font-medium text-sm flex-1">{step.name}</span>
                <Badge variant="outline" className="text-xs">{step.code}</Badge>
                {step.defaultRoleCode && (
                  <Badge variant="secondary" className="text-xs">{step.defaultRoleCode}</Badge>
                )}
                {step.isActive ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-foreground-secondary" />
                )}

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Edit step"
                    onClick={() => handleEdit(step)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={step.isActive ? 'Deactivate step' : 'Activate step'}
                    onClick={() => toggleMutation.mutate(step.id)}
                  >
                    {step.isActive ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-error hover:text-error"
                    aria-label="Delete step"
                    onClick={() => {
                      if (confirm('Delete this workflow step? Active tasks referencing it will prevent deletion.')) {
                        deleteMutation.mutate(step.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expandedId === step.id && (
                <div className="px-3 pb-3 pt-0 border-t space-y-2">
                  {step.description && (
                    <p className="text-xs text-foreground-secondary">{step.description}</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-foreground-secondary">Type:</span>{' '}
                      {step.type || '—'}
                    </div>
                    <div>
                      <span className="text-foreground-secondary">Department:</span>{' '}
                      {step.defaultDepartment || '—'}
                    </div>
                    <div>
                      <span className="text-foreground-secondary">Milestone:</span>{' '}
                      {step.defaultMilestoneType || '—'}
                    </div>
                    <div>
                      <span className="text-foreground-secondary">Est. Hours:</span>{' '}
                      {step.estimatedDurationHours ?? '—'}
                    </div>
                  </div>
                  {step.dependsOnTaskCodes && step.dependsOnTaskCodes.length > 0 && (
                    <div className="text-xs">
                      <span className="text-foreground-secondary">Depends on: </span>
                      {step.dependsOnTaskCodes.map((code) => (
                        <Badge key={code} variant="outline" className="text-xs mr-1">{code}</Badge>
                      ))}
                    </div>
                  )}
                  {step.allowedTransitions && (
                    <div className="text-xs">
                      <span className="text-foreground-secondary font-medium">FSM Overrides:</span>
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        {Object.entries(step.allowedTransitions).map(([from, targets]) => (
                          <div key={from} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-2xs">{TASK_STATUS_LABELS[from as TaskStatus] || from}</Badge>
                            <span className="text-foreground-tertiary">→</span>
                            {(targets).map((to) => (
                              <Badge key={to} variant="secondary" className="text-2xs">{TASK_STATUS_LABELS[to as TaskStatus] || to}</Badge>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <StepFormSheet
        open={isCreating || !!editingStep}
        step={editingStep}
        onClose={handleClose}
      />
    </div>
  );
}

function StepFormSheet({
  open,
  step,
  onClose,
}: {
  open: boolean;
  step: WorkflowStep | null;
  onClose: () => void;
}) {
  const isEditing = !!step;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [defaultRoleCode, setDefaultRoleCode] = useState('');
  const [defaultDepartment, setDefaultDepartment] = useState('');
  const [defaultMilestoneType, setDefaultMilestoneType] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState(1);
  const [estimatedDurationHours, setEstimatedDurationHours] = useState<number | undefined>();
  const [isMandatory, setIsMandatory] = useState(true);
  const [canRunParallel, setCanRunParallel] = useState(false);
  const [dependsOnTaskCodes, setDependsOnTaskCodes] = useState('');
  const [checklistTemplate, setChecklistTemplate] = useState('');
  const [allowedTransitionsJson, setAllowedTransitionsJson] = useState('');

  const resetForm = useCallback(() => {
    if (step) {
      setName(step.name);
      setCode(step.code);
      setDescription(step.description || '');
      setType(step.type || '');
      setDefaultRoleCode(step.defaultRoleCode || '');
      setDefaultDepartment(step.defaultDepartment || '');
      setDefaultMilestoneType(step.defaultMilestoneType || '');
      setSequenceOrder(step.sequenceOrder);
      setEstimatedDurationHours(step.estimatedDurationHours);
      setIsMandatory(step.isMandatory);
      setCanRunParallel(step.canRunParallel);
      setDependsOnTaskCodes(step.dependsOnTaskCodes?.join(', ') || '');
      setChecklistTemplate(
        step.checklistTemplate
          ? JSON.stringify(step.checklistTemplate, null, 2)
          : '',
      );
      setAllowedTransitionsJson(
        step.allowedTransitions ? JSON.stringify(step.allowedTransitions, null, 2) : '',
      );
    } else {
      setName('');
      setCode('');
      setDescription('');
      setType('');
      setDefaultRoleCode('');
      setDefaultDepartment('');
      setDefaultMilestoneType('');
      setSequenceOrder(1);
      setEstimatedDurationHours(undefined);
      setIsMandatory(true);
      setCanRunParallel(false);
      setDependsOnTaskCodes('');
      setChecklistTemplate('');
      setAllowedTransitionsJson('');
    }
  }, [step]);

  // Reset form when step changes or sheet opens
  useEffect(() => {
    if (open) resetForm();
  }, [open, step, resetForm]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) onClose();
    },
    [onClose],
  );

  const saveMutation = useSaveWorkflowStep({ onSuccess: onClose });

  const handleSave = useCallback(() => {
    let parsedChecklist: unknown = undefined;
    if (checklistTemplate.trim()) {
      try { parsedChecklist = JSON.parse(checklistTemplate); }
      catch { showToast.error('Checklist template is not valid JSON'); return; }
    }

    let parsedTransitions: Record<string, string[]> | undefined = undefined;
    if (allowedTransitionsJson.trim()) {
      try { parsedTransitions = JSON.parse(allowedTransitionsJson); }
      catch { showToast.error('Allowed transitions is not valid JSON'); return; }
    }

    const depCodes = dependsOnTaskCodes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    saveMutation.mutate({
      id: step?.id,
      name,
      code,
      description: description || undefined,
      type: type || undefined,
      defaultRoleCode: defaultRoleCode || undefined,
      defaultDepartment: defaultDepartment || undefined,
      defaultMilestoneType: defaultMilestoneType || undefined,
      sequenceOrder,
      estimatedDurationHours,
      isMandatory,
      canRunParallel,
      dependsOnTaskCodes: depCodes.length > 0 ? depCodes : undefined,
      checklistTemplate: parsedChecklist,
      allowedTransitions: parsedTransitions,
    });
  }, [
    step?.id, name, code, description, type, defaultRoleCode, defaultDepartment,
    defaultMilestoneType, sequenceOrder, estimatedDurationHours, isMandatory,
    canRunParallel, dependsOnTaskCodes, checklistTemplate, allowedTransitionsJson,
    saveMutation,
  ]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Workflow Step' : 'Create Workflow Step'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Panel Installation" />
          </div>

          <div className="space-y-2">
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. EXEC-001" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. execution" />
            </div>
            <div className="space-y-2">
              <Label>Default Role Code</Label>
              <Input value={defaultRoleCode} onChange={(e) => setDefaultRoleCode(e.target.value)} placeholder="e.g. execution" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sequence Order *</Label>
              <Input
                type="number"
                value={sequenceOrder}
                onChange={(e) => setSequenceOrder(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Est. Duration (hours)</Label>
              <Input
                type="number"
                value={estimatedDurationHours ?? ''}
                onChange={(e) =>
                  setEstimatedDurationHours(e.target.value ? Number(e.target.value) : undefined)
                }
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={defaultDepartment} onChange={(e) => setDefaultDepartment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Milestone Type</Label>
              <Input
                value={defaultMilestoneType}
                onChange={(e) => setDefaultMilestoneType(e.target.value)}
                placeholder="e.g. installation"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Depends On (comma-separated codes)</Label>
            <Input
              value={dependsOnTaskCodes}
              onChange={(e) => setDependsOnTaskCodes(e.target.value)}
              placeholder="e.g. EXEC-001, DES-001"
            />
          </div>

          <div className="space-y-2">
            <Label>Checklist Template (JSON)</Label>
            <Textarea
              value={checklistTemplate}
              onChange={(e) => setChecklistTemplate(e.target.value)}
              rows={4}
              placeholder='{"items":[{"text":"Item 1","checked":false}]}'
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label>Allowed Transitions Override (JSON)</Label>
            <Textarea
              value={allowedTransitionsJson}
              onChange={(e) => setAllowedTransitionsJson(e.target.value)}
              rows={4}
              placeholder='{"backlog":["todo"],"todo":["in_progress"]}'
              className="font-mono text-xs"
            />
            <p className="text-xs text-foreground-secondary">
              Leave empty to use project-level or system defaults.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Checkbox
              id="isMandatory"
              checked={isMandatory}
              onCheckedChange={(checked) => setIsMandatory(checked === true)}
              label="Mandatory"
            />
            <Checkbox
              id="canRunParallel"
              checked={canRunParallel}
              onCheckedChange={(checked) => setCanRunParallel(checked === true)}
              label="Can run in parallel"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!name || !code || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
