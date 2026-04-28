'use client';

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { FormProvider } from 'react-hook-form';

import { WizardFooter } from './components/wizard-footer';
import { WIZARD_STEPS, TOTAL_STEPS } from './constants';
import { useProjectCreateForm } from './hooks/use-project-create-form';
import { useProjectCreateSubmit } from './hooks/use-project-create-submit';
import { Step1SourceSelection } from './steps/step-1-source-selection';
import { Step2ProjectDetails } from './steps/step-2-project-details';
import { Step3TeamSelection } from './steps/step-3-team-selection';
import { Step4StatusConfig } from './steps/step-4-status-config';
import { Step5TasksMilestones } from './steps/step-5-tasks-milestones';
import { Step6Review } from './steps/step-6-review';

import { Stepper } from '@/components/shared/wizards/stepper';
import { MUIBreadcrumb, MUITypography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

// ── Breadcrumb items ───────────────────────────────────────────

const breadcrumbItems = [
  { label: 'Projects', href: ROUTES.PROJECTS.DASHBOARD },
  { label: 'New Project' },
];

// ── Step router ────────────────────────────────────────────────

function StepContent({
  step,
  form,
}: {
  step: number;
  form: ReturnType<typeof useProjectCreateForm>['form'];
}) {
  switch (step) {
    case 0:
      return <Step1SourceSelection form={form} />;
    case 1:
      return <Step2ProjectDetails form={form} />;
    case 2:
      return <Step3TeamSelection form={form} />;
    case 3:
      return <Step4StatusConfig form={form} />;
    case 4:
      return <Step5TasksMilestones form={form} />;
    case 5:
      return <Step6Review form={form} />;
    default:
      return null;
  }
}

// ── Main Component ─────────────────────────────────────────────

function ProjectCreatePageInner(): React.JSX.Element {
  const router = useRouter();
  const { form, currentStep, goNext, goBack, goTo } = useProjectCreateForm();
  const { submit, isPending } = useProjectCreateSubmit(form);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOTAL_STEPS - 1;

  async function handleNext(): Promise<void> {
    if (isLastStep) {
      await submit();
    } else {
      await goNext();
    }
  }

  const stepperSteps = WIZARD_STEPS.map((s) => ({ id: s.id, label: s.label }));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-6 pt-6 pb-2">
        <MUIBreadcrumb items={breadcrumbItems} />
        <div className="mt-3 mb-6">
          <MUITypography variant="drawerTitle">Create Project</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary mt-1">
            Fill in the details below to create a new solar project.
          </MUITypography>
        </div>

        <Stepper
          steps={stepperSteps}
          currentStep={currentStep}
          variant="horizontal"
          onStepClick={goTo}
          allowClickPrevious={false}
          className="mb-8"
        />
      </div>

      <div className="flex-1 px-6 pb-4">
        <FormProvider {...form}>
          <StepContent step={currentStep} form={form} />
        </FormProvider>
      </div>

      <div className="px-6 pb-6">
        <WizardFooter
          onNext={() => void handleNext()}
          onBack={goBack}
          onCancel={() => router.back()}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          isSubmitting={isPending}
        />
      </div>
    </div>
  );
}

export function ProjectCreatePage(): React.JSX.Element {
  return (
    <Suspense>
      <ProjectCreatePageInner />
    </Suspense>
  );
}
