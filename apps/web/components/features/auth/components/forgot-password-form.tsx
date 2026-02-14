'use client';

import { Info, KeyRound, Mail } from 'lucide-react';
import Link from 'next/link';

import { useForgotPassword } from '../hooks/use-forgot-password';

import { Alert } from '@/components/shared';
import { Button, Card, Input, Spinner, Typography } from '@/components/ui';

/**
 * ForgotPasswordForm Component
 * Pure UI component - all logic delegated to useForgotPassword hook.
 * Uses enhanced Input component for cleaner code.
 */
export function ForgotPasswordForm(): React.JSX.Element {
  const { isLoading, isSuccess, submittedEmail, displayError, form, onSubmit, handleResend } =
    useForgotPassword();

  // Success state
  if (isSuccess) {
    return (
      <Card variant="elevated" padding="default">
        <div className="text-center mb-6">
          <div className="size-container-lg mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <Mail className="size-icon-xl text-success" />
          </div>
          <Typography variant="h3" className="mb-1">
            Check your email
          </Typography>
          <Typography variant="body" color="muted" size="sm">
            If an account exists for{' '}
            <Typography as="span" weight="medium" color="default">
              {submittedEmail}
            </Typography>
            ,
            <br />
            you&apos;ll receive a password reset link shortly.
          </Typography>
        </div>

        <Card variant="minimal" padding="default" className="mb-6">
          <div className="flex items-start gap-3">
            <Info className="size-icon-md text-foreground-tertiary mt-0.5" />
            <div className="text-sm text-foreground-secondary">
              <Typography variant="body" size="sm" className="mb-2">
                Can&apos;t find the email? Check your spam folder.
              </Typography>
              <Typography variant="body" size="sm">
                The reset link will expire in{' '}
                <Typography as="span" weight="medium">
                  15 minutes
                </Typography>
                .
              </Typography>
            </div>
          </div>
        </Card>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-4"
          onClick={handleResend}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner size="xs" variant="muted" className="mr-2" />
              Sending...
            </>
          ) : (
            'Resend Email'
          )}
        </Button>

        <div className="text-center">
          <Typography variant="link" size="sm" color="muted" asChild>
            <Link href="/login">← Back to login</Link>
          </Typography>
        </div>
      </Card>
    );
  }

  // Form state
  return (
    <Card variant="elevated" padding="default">
      <div className="text-center mb-6">
        <div className="size-container-lg mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <KeyRound className="size-icon-xl text-primary" />
        </div>
        <Typography variant="h3" className="mb-1">
          Forgot password?
        </Typography>
        <Typography variant="body" color="muted" size="sm">
          No worries, we&apos;ll send you reset instructions.
        </Typography>
      </div>

      {displayError && (
        <Alert variant="error" appearance="minimal" className="mb-4">
          {displayError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          {...form.register('email')}
          type="email"
          label="Email Address"
          leftIcon={<Mail />}
          placeholder="you@company.com"
          autoComplete="email"
          disabled={isLoading}
          error={!!form.formState.errors.email}
          errorMessage={form.formState.errors.email?.message}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner size="xs" variant="white" className="mr-2" />
              Sending...
            </>
          ) : (
            'Send Reset Link'
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
