'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';

import { useLoginForm } from '../hooks/use-login-form';

import { Alert } from '@/components/shared';
import { ROUTES } from '@/lib/config/routes';
import {
  Button,
  Card,
  Checkbox,
  Input,
  PasswordInput,
  PhoneInput,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Typography,
} from '@/components/ui';

/**
 * LoginForm Component
 * Pure UI component - all logic delegated to useLoginForm hook.
 * Uses enhanced Input components for cleaner code.
 */
export function LoginForm(): React.JSX.Element {
  const {
    activeTab,
    setActiveTab,
    isLoading,
    displayError,
    passwordForm,
    otpForm,
    onPasswordSubmit,
    onOtpSubmit,
  } = useLoginForm();

  return (
    <Card variant="elevated" padding="default">
      {/* Header */}
      <div className="mb-6">
        <Typography variant="h3" className="mb-1">
          Welcome back
        </Typography>
        <Typography variant="body" color="muted" size="sm">
          Sign in to your account to continue
        </Typography>
      </div>

      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-5">
        <TabsList className="w-full">
          <TabsTrigger value="password" className="flex-1">
            Password
          </TabsTrigger>
          <TabsTrigger value="otp" className="flex-1">
            OTP
          </TabsTrigger>
        </TabsList>

        {/* Error Alert */}
        {displayError && (
          <Alert variant="error" appearance="minimal" className="mt-4">
            {displayError}
          </Alert>
        )}

        {/* Password Login Form */}
        <TabsContent value="password" className="mt-4">
          <form className="space-y-4" onSubmit={onPasswordSubmit}>
            <Input
              {...passwordForm.register('email')}
              type="email"
              label="Email Address"
              leftIcon={<Mail />}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={isLoading}
              error={!!passwordForm.formState.errors.email}
              errorMessage={passwordForm.formState.errors.email?.message}
            />

            <PasswordInput
              {...passwordForm.register('password')}
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
              error={!!passwordForm.formState.errors.password}
              errorMessage={passwordForm.formState.errors.password?.message}
            />

            <div className="flex items-center justify-between">
              <Checkbox
                checked={passwordForm.watch('rememberMe')}
                onCheckedChange={(checked) =>
                  passwordForm.setValue('rememberMe', checked === true)
                }
                size="sm"
                label="Remember me"
              />
              <Typography variant="link" size="sm" color="primary" asChild>
                <Link href={ROUTES.AUTH.FORGOT_PASSWORD}>Forgot password?</Link>
              </Typography>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner size="xs" variant="white" className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </TabsContent>

        {/* OTP Login Form */}
        <TabsContent value="otp" className="mt-4">
          <form className="space-y-4" onSubmit={onOtpSubmit}>
            <PhoneInput
              value={otpForm.watch('phone')}
              onChange={(value) => otpForm.setValue('phone', value)}
              label="Phone Number"
              disabled={isLoading}
              error={!!otpForm.formState.errors.phone}
              errorMessage={otpForm.formState.errors.phone?.message}
              helperText="We'll send a one-time password to this number"
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner size="xs" variant="white" className="mr-2" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Divider */}
      <div className="flex items-center my-5">
        <div className="flex-1 border-t border-border-light" />
        <Typography variant="caption" color="muted" className="px-3">
          or
        </Typography>
        <div className="flex-1 border-t border-border-light" />
      </div>

      {/* Sign Up Link */}
      <div className="text-center">
        <Typography variant="body" size="sm" color="muted">
          Don&apos;t have an account?{' '}
          <Typography variant="link" color="primary" asChild>
            <Link href={ROUTES.AUTH.REGISTER}>Contact your administrator</Link>
          </Typography>
        </Typography>
      </div>
    </Card>
  );
}
