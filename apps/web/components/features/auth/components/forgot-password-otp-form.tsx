'use client';

import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import { Alert, Button, CircularProgress } from '@mui/material';
import Link from 'next/link';

import { useForgotPasswordOtp } from '../hooks/use-forgot-password-otp';

import { OtpInput, MUITypography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

export function ForgotPasswordOtpForm(): React.JSX.Element {
  const {
    maskedPhone,
    otp,
    setOtp,
    countdown,
    isVerifying,
    isResending,
    displayError,
    handleVerify,
    handleResend,
    otpLength,
  } = useForgotPasswordOtp();

  return (
    <div className="rounded-2xl bg-card p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <SmartphoneOutlinedIcon className="text-primary" fontSize="large" />
        </div>
        <MUITypography variant="drawerTitle">Verify OTP</MUITypography>
        <MUITypography variant="body" className="mt-1">
          We sent a 6-digit OTP to{' '}
          <MUITypography component="span" variant="bodyPrimary">
            {maskedPhone}
          </MUITypography>
          .
        </MUITypography>
      </div>

      {displayError && (
        <Alert severity="error" className="mb-5">
          {displayError}
        </Alert>
      )}

      <div className="mb-6 flex justify-center">
        <OtpInput
          length={otpLength}
          value={otp}
          onChange={setOtp}
          onComplete={() => handleVerify()}
          disabled={isVerifying || isResending}
          error={!!displayError}
        />
      </div>

      <Button
        type="button"
        variant="contained"
        fullWidth
        size="large"
        disableElevation
        onClick={handleVerify}
        disabled={otp.length !== otpLength || isVerifying || isResending}
      >
        {isVerifying ? (
          <span className="flex items-center gap-2">
            <CircularProgress size={18} color="inherit" />
            Verifying...
          </span>
        ) : (
          'Verify OTP'
        )}
      </Button>

      <div className="mt-5 text-center">
        {countdown > 0 ? (
          <MUITypography variant="body">Resend OTP in {countdown}s</MUITypography>
        ) : (
          <Button type="button" variant="text" onClick={handleResend} disabled={isResending}>
            {isResending ? 'Sending...' : 'Resend OTP'}
          </Button>
        )}
      </div>

      <div className="mt-6 pt-4 text-center">
        <Link href={ROUTES.AUTH.LOGIN} className="no-underline">
          <MUITypography variant="body" color="primary">
            ← Back to login
          </MUITypography>
        </Link>
      </div>
    </div>
  );
}
