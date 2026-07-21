'use client';

import { Smartphone } from 'lucide-react';
import Link from 'next/link';

import { useOtpVerify } from '../hooks/use-otp-verify';

import { Alert } from '@/components/shared';
import { Button, Card, OtpInput, Spinner, Typography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

/**
 * OtpVerifyForm Component
 * Pure UI component - all logic delegated to useOtpVerify hook.
 * Uses OtpInput component for cleaner code.
 */
export function OtpVerifyForm(): React.JSX.Element {
  const {
    formattedPhone,
    otp,
    setOtp,
    isLoading,
    isResending,
    isSuccess,
    displayError,
    resendCooldown,
    handleSubmit,
    handleResend,
    OTP_LENGTH,
  } = useOtpVerify();

  return (
    <Card variant="elevated" padding="default">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="size-container-lg mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Smartphone className="size-icon-xl text-primary" />
        </div>
        <Typography variant="h3" className="mb-1">
          Verify your phone
        </Typography>
        <Typography variant="body" color="muted" size="sm">
          We sent a 6-digit code to <br />
          <Typography as="span" weight="medium" color="default">
            {formattedPhone}
          </Typography>
        </Typography>
      </div>

      {/* Error Alert */}
      {displayError && (
        <Alert variant="error" appearance="minimal" className="mb-4">
          {displayError}
        </Alert>
      )}

      {/* Success state */}
      {isSuccess && (
        <Alert variant="success" appearance="minimal" className="mb-4">
          Verification successful! Redirecting...
        </Alert>
      )}

      {/* OTP Input */}
      <div className="mb-6 flex justify-center">
        <OtpInput
          length={OTP_LENGTH}
          value={otp}
          onChange={setOtp}
          onComplete={handleSubmit}
          disabled={isLoading || isSuccess}
          error={!!displayError}
        />
      </div>

      {/* Verify Button */}
      <Button
        type="button"
        className="w-full mb-4"
        onClick={() => handleSubmit(otp)}
        disabled={otp.length !== OTP_LENGTH || isLoading || isSuccess}
      >
        {isLoading ? (
          <>
            <Spinner size="xs" variant="white" className="mr-2" />
            Verifying...
          </>
        ) : (
          'Verify & Login'
        )}
      </Button>

      {/* Resend Section */}
      <div className="text-center">
        <Typography variant="body" size="sm" color="muted" className="mb-2">
          Didn&apos;t receive the code?
        </Typography>
        {resendCooldown > 0 ? (
          <Typography variant="body" size="sm" color="muted">
            Resend in{' '}
            <Typography as="span" weight="medium" color="default">
              {Math.floor(resendCooldown / 60)}:{(resendCooldown % 60).toString().padStart(2, '0')}
            </Typography>
          </Typography>
        ) : (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Sending...' : 'Resend OTP'}
          </Button>
        )}
      </div>

      {/* Back to Login */}
      <div className="mt-6 pt-4 text-center">
        <Typography variant="link" size="sm" color="muted" asChild>
          <Link href={ROUTES.AUTH.LOGIN}>← Back to login</Link>
        </Typography>
      </div>
    </Card>
  );
}
