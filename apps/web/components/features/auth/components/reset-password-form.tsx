'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import { useResetPassword } from '../hooks/use-reset-password';

import { MUITypography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { cn } from '@/lib/utils';

export function ResetPasswordForm(): React.JSX.Element {
  const {
    isLoading,
    isSuccess,
    displayError,
    passwordStrength,
    passwordsMatch,
    watchedPassword,
    watchedConfirm,
    form,
    onSubmit,
  } = useResetPassword();

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (isSuccess) {
    return (
      <div className="rounded-2xl border border-border-light bg-card p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircleOutlineIcon className="text-green-600" fontSize="large" />
          </div>
          <MUITypography variant="drawerTitle">Password reset successful</MUITypography>
          <MUITypography variant="body" className="mt-1">
            Your password has been updated successfully.
            <br />
            You can now sign in with your new password.
          </MUITypography>
        </div>

        <Button
          variant="contained"
          fullWidth
          size="large"
          disableElevation
          href={ROUTES.AUTH.LOGIN}
          LinkComponent={Link}
        >
          Continue to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-light bg-card p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <LockOutlinedIcon className="text-primary" fontSize="large" />
        </div>
        <MUITypography variant="drawerTitle">Set new password</MUITypography>
        <MUITypography variant="body" className="mt-1">
          Your new password must be different from
          <br />
          previously used passwords.
        </MUITypography>
      </div>

      {displayError && (
        <Alert severity="error" className="mb-5">
          {displayError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <TextField
            {...form.register('newPassword')}
            type={showNewPassword ? 'text' : 'password'}
            label="New Password"
            placeholder="Enter new password"
            autoComplete="new-password"
            disabled={isLoading}
            error={!!form.formState.errors.newPassword}
            helperText={form.formState.errors.newPassword?.message}
            fullWidth
            InputProps={{
              sx: { height: 44 },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    edge="end"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <VisibilityOff fontSize="small" />
                    ) : (
                      <Visibility fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {watchedPassword && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all',
                      i <= passwordStrength.score ? passwordStrength.color : 'bg-border-light',
                    )}
                  />
                ))}
              </div>
              <MUITypography variant="finePrint">
                Password strength:{' '}
                <MUITypography variant="bodyPrimary" component="span">
                  {passwordStrength.label}
                </MUITypography>
              </MUITypography>
            </div>
          )}
        </div>

        <div>
          <TextField
            {...form.register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            label="Confirm Password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            disabled={isLoading}
            error={!!form.formState.errors.confirmPassword}
            helperText={form.formState.errors.confirmPassword?.message}
            fullWidth
            InputProps={{
              sx: { height: 44 },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    edge="end"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <VisibilityOff fontSize="small" />
                    ) : (
                      <Visibility fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {watchedConfirm && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {passwordsMatch ? (
                <MUITypography variant="finePrint" color="success.main">
                  ✓ Passwords match
                </MUITypography>
              ) : (
                <MUITypography variant="finePrint" color="error.main">
                  ✗ Passwords do not match
                </MUITypography>
              )}
            </div>
          )}
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
              Resetting...
            </span>
          ) : (
            'Reset Password'
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
