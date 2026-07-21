'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import MuiButton from '@mui/material/Button';

// ── Props ──────────────────────────────────────────────────────

interface WizardFooterProps {
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  isNextDisabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export function WizardFooter({
  onNext,
  onBack,
  onCancel,
  isFirstStep,
  isLastStep,
  isSubmitting,
  isNextDisabled = false,
}: WizardFooterProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between pt-4 mt-4">
      <div className="flex items-center gap-2">
        {!isFirstStep && (
          <MuiButton
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </MuiButton>
        )}
        <MuiButton variant="text" color="inherit" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </MuiButton>
      </div>

      <MuiButton
        variant="contained"
        color="primary"
        endIcon={isLastStep ? <RocketLaunchIcon /> : <ArrowForwardIcon />}
        onClick={onNext}
        disabled={isNextDisabled || isSubmitting}
        loading={isSubmitting}
      >
        {isLastStep ? 'Create Project' : 'Next'}
      </MuiButton>
    </div>
  );
}
