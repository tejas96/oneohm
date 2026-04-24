'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyIcon from '@mui/icons-material/Key';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { Alert, Button, CircularProgress, InputAdornment, TextField } from '@mui/material';
import Link from 'next/link';

import { useForgotPassword } from '../hooks/use-forgot-password';

import { MUITypography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

export function ForgotPasswordForm(): React.JSX.Element {
  const { isLoading, isSuccess, submittedEmail, displayError, form, onSubmit, handleResend } =
    useForgotPassword();

  if (isSuccess) {
    return (
      <div className="rounded-2xl border border-border-light bg-card p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <MailOutlineIcon className="text-green-600" fontSize="large" />
          </div>
          <MUITypography variant="drawerTitle">Check your email</MUITypography>
          <MUITypography variant="body" className="mt-1">
            If an account exists for{' '}
            <MUITypography variant="bodyPrimary" component="span">
              {submittedEmail}
            </MUITypography>
            ,
            <br />
            you&apos;ll receive a password reset link shortly.
          </MUITypography>
        </div>

        <div className="rounded-xl border border-border-light bg-surface-primary p-4 mb-6">
          <div className="flex items-start gap-3">
            <InfoOutlinedIcon fontSize="small" className="text-text-tertiary mt-0.5" />
            <div>
              <MUITypography variant="body" className="mb-1">
                Can&apos;t find the email? Check your spam folder.
              </MUITypography>
              <MUITypography variant="body">
                The reset link will expire in{' '}
                <MUITypography variant="bodyPrimary" component="span">
                  15 minutes
                </MUITypography>
                .
              </MUITypography>
            </div>
          </div>
        </div>

        <Button
          variant="outlined"
          fullWidth
          onClick={handleResend}
          disabled={isLoading}
          size="large"
          className="mb-4"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <CircularProgress size={18} color="inherit" />
              Sending...
            </span>
          ) : (
            'Resend Email'
          )}
        </Button>

        <div className="text-center">
          <Link href={ROUTES.AUTH.LOGIN} className="no-underline">
            <MUITypography variant="body" color="primary">
              ← Back to login
            </MUITypography>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-light bg-card p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <KeyIcon className="text-primary" fontSize="large" />
        </div>
        <MUITypography variant="drawerTitle">Forgot password?</MUITypography>
        <MUITypography variant="body" className="mt-1">
          No worries, we&apos;ll send you reset instructions.
        </MUITypography>
      </div>

      {displayError && (
        <Alert severity="error" className="mb-5">
          {displayError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          {...form.register('email')}
          type="email"
          label="Email Address"
          placeholder="you@company.com"
          autoComplete="email"
          disabled={isLoading}
          error={!!form.formState.errors.email}
          helperText={form.formState.errors.email?.message}
          fullWidth
          InputProps={{
            sx: { height: 44 },
            startAdornment: (
              <InputAdornment position="start">
                <MailOutlineIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

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
            'Send Reset Link'
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
