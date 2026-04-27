'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import { Alert, Button, CircularProgress, InputAdornment, TextField } from '@mui/material';
import Link from 'next/link';

import { useForgotPassword } from '../hooks/use-forgot-password';

import { MUITypography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

export function ForgotPasswordForm(): React.JSX.Element {
  const { isLoading, displayError, form, onSubmit } = useForgotPassword();

  return (
    <div className="rounded-2xl border border-border-light bg-card p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <SmartphoneOutlinedIcon className="text-primary" fontSize="large" />
        </div>
        <MUITypography variant="drawerTitle">Forgot password?</MUITypography>
        <MUITypography variant="body" className="mt-1">
          Enter your mobile number and we&apos;ll send an OTP.
        </MUITypography>
      </div>

      {displayError && (
        <Alert severity="error" className="mb-5">
          {displayError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          {...form.register('phone')}
          type="tel"
          label="Mobile Number"
          placeholder="Enter 10-digit mobile number"
          autoComplete="tel-national"
          disabled={isLoading}
          error={!!form.formState.errors.phone}
          helperText={form.formState.errors.phone?.message}
          fullWidth
          InputProps={{
            sx: { height: 44 },
            startAdornment: (
              <InputAdornment position="start">
                <MUITypography variant="bodyPrimary">+91</MUITypography>
              </InputAdornment>
            ),
          }}
        />

        <div className="rounded-xl border border-border-light bg-surface-primary p-4">
          <div className="flex items-start gap-3">
            <InfoOutlinedIcon fontSize="small" className="text-text-tertiary mt-0.5" />
            <MUITypography variant="body">
              OTP is valid for{' '}
              <MUITypography component="span" variant="bodyPrimary">
                5 minutes
              </MUITypography>
              .
            </MUITypography>
          </div>
        </div>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isLoading}
          size="large"
          disableElevation
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <CircularProgress size={18} color="inherit" />
              Sending...
            </span>
          ) : (
            'Send OTP'
          )}
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-border-light text-center">
        <Link href={ROUTES.AUTH.LOGIN} className="no-underline">
          <MUITypography variant="body" color="primary">
            ← Back to login
          </MUITypography>
        </Link>
      </div>
    </div>
  );
}
