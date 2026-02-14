'use client';

import { Check, Lock, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';

import { useResetPassword } from '../hooks/use-reset-password';

import { Alert } from '@/components/shared';
import { Button, Card, PasswordInput, Spinner, Typography } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * ResetPasswordForm Component
 * Pure UI component - all logic delegated to useResetPassword hook.
 * Uses PasswordInput component for cleaner code.
 */
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

  // Success state
  if (isSuccess) {
    return (
      <Card variant="elevated" padding="default">
        <div className="text-center mb-6">
          <div className="size-container-lg mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="size-icon-xl text-success" />
          </div>
          <Typography variant="h3" className="mb-1">
            Password reset successful
          </Typography>
          <Typography variant="body" color="muted" size="sm">
            Your password has been updated successfully.
            <br />
            You can now sign in with your new password.
          </Typography>
        </div>

        <Button className="w-full" asChild>
          <Link href="/login">Continue to Login</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="default">
      <div className="text-center mb-6">
        <div className="size-container-lg mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="size-icon-xl text-primary" />
        </div>
        <Typography variant="h3" className="mb-1">
          Set new password
        </Typography>
        <Typography variant="body" color="muted" size="sm">
          Your new password must be different from
          <br />
          previously used passwords.
        </Typography>
      </div>

      {displayError && (
        <Alert variant="error" appearance="minimal" className="mb-4">
          {displayError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <PasswordInput
            {...form.register('newPassword')}
            label="New Password"
            placeholder="Enter new password"
            autoComplete="new-password"
            disabled={isLoading}
            error={!!form.formState.errors.newPassword}
            errorMessage={form.formState.errors.newPassword?.message}
          />

          {/* Password Strength */}
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
              <Typography variant="caption" color="muted">
                Password strength:{' '}
                <Typography as="span" weight="medium">
                  {passwordStrength.label}
                </Typography>
              </Typography>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <PasswordInput
            {...form.register('confirmPassword')}
            label="Confirm Password"
            leftIcon={<ShieldCheck />}
            placeholder="Confirm new password"
            autoComplete="new-password"
            disabled={isLoading}
            error={!!form.formState.errors.confirmPassword}
            errorMessage={form.formState.errors.confirmPassword?.message}
          />

          {/* Match indicator */}
          {watchedConfirm && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {passwordsMatch ? (
                <>
                  <Check className="size-icon-xs text-success" />
                  <Typography variant="caption" color="success">
                    Passwords match
                  </Typography>
                </>
              ) : (
                <>
                  <X className="size-icon-xs text-error" />
                  <Typography variant="caption" color="error">
                    Passwords do not match
                  </Typography>
                </>
              )}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner size="xs" variant="white" className="mr-2" />
              Resetting...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-border-light text-center">
        <Typography variant="link" size="sm" color="muted" asChild>
          <Link href="/login">← Back to login</Link>
        </Typography>
      </div>
    </Card>
  );
}
