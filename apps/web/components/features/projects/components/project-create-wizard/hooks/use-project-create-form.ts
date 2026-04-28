'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MilestoneType, ProjectPriority, type TaskStatusConfig } from '@oneohm-epc/shared/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { DEFAULT_MILESTONES } from '../../../constants';
import {
  projectCreateSchema,
  type ProjectCreateFormData,
} from '../../../schemas/project-create.schema';
import { TOTAL_STEPS, WIZARD_STEPS } from '../constants';

// ── Types ──────────────────────────────────────────────────────

export interface UseProjectCreateFormReturn {
  form: UseFormReturn<ProjectCreateFormData>;
  currentStep: number;
  furthestStep: number;
  goNext: () => Promise<boolean>;
  goBack: () => void;
  goTo: (n: number) => void;
}

// ── Hook ───────────────────────────────────────────────────────

export function useProjectCreateForm(): UseProjectCreateFormReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCustomerId = searchParams.get('customerId') ?? '';
  const initialPropertyId = searchParams.get('propertyId') ?? '';
  const initialQuoteId = searchParams.get('quoteId') ?? '';
  const initialStep = Math.max(0, Math.min(Number(searchParams.get('step') ?? 0), TOTAL_STEPS - 1));

  /** Format using local calendar date to avoid UTC timezone shift. */
  function localIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const todayIso = localIso(new Date());
  const oneMonthLaterIso = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return localIso(d);
  })();

  const form = useForm<ProjectCreateFormData>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      quoteId: initialQuoteId || '',
      propertyId: initialPropertyId || '',
      customerId: initialCustomerId || '',
      name: '',
      priority: ProjectPriority.NORMAL,
      startDate: todayIso,
      endDate: oneMonthLaterIso,
      description: '',
      projectManagerId: '',
      teamMembers: [],
      excludedStepIds: [],
      taskAssignments: [],
      taskMilestoneOverrides: [],
      milestones: DEFAULT_MILESTONES.map((m, i) => ({
        id: crypto.randomUUID(),
        name: m.name,
        type: m.type as MilestoneType,
        order: i + 1,
      })),
      taskStatuses: [] as TaskStatusConfig[],
    },
    mode: 'onTouched',
  });

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [furthestStep, setFurthestStep] = useState<number>(initialStep);

  // Sync URL when step changes — intentionally omit searchParams from deps
  // to prevent infinite loop (router.replace updates searchParams, re-triggering)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('step', String(currentStep));
    const customerId = form.getValues('customerId');
    const propertyId = form.getValues('propertyId');
    const quoteId = form.getValues('quoteId');
    if (customerId) params.set('customerId', customerId);
    else params.delete('customerId');
    if (propertyId) params.set('propertyId', propertyId);
    else params.delete('propertyId');
    if (quoteId) params.set('quoteId', quoteId);
    else params.delete('quoteId');
    router.replace(`?${params.toString()}`);
  }, [currentStep, form, router]);

  const goNext = useCallback(async (): Promise<boolean> => {
    if (currentStep >= TOTAL_STEPS - 1) return false;
    const fields = WIZARD_STEPS[currentStep]?.fields ?? [];
    if (fields.length === 0) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setFurthestStep((prev) => Math.max(prev, next));
      return true;
    }
    const valid = await form.trigger(fields);
    if (!valid) return false;
    const next = currentStep + 1;
    setCurrentStep(next);
    setFurthestStep((prev) => Math.max(prev, next));
    return true;
  }, [currentStep, form]);

  const goBack = useCallback(() => {
    if (currentStep <= 0) return;
    setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  const goTo = useCallback(
    (n: number) => {
      if (n < 0 || n >= TOTAL_STEPS) return;
      if (n > furthestStep) return; // cannot jump ahead
      setCurrentStep(n);
    },
    [furthestStep],
  );

  return { form, currentStep, furthestStep, goNext, goBack, goTo };
}
