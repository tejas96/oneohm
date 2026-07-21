'use client';

import MailOutlineIcon from '@mui/icons-material/MailOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import { useLoginForm } from '../hooks/use-login-form';

import { MUITypography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

export function LoginForm(): React.JSX.Element {
  const { isLoading, displayError, passwordForm, onPasswordSubmit } = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="rounded-2xl bg-card p-8 shadow-lg">
      <div className="mb-8">
        <MUITypography variant="drawerTitle">Welcome back</MUITypography>
        <MUITypography variant="body" className="mt-1">
          Sign in to your account to continue
        </MUITypography>
      </div>

      {displayError && (
        <Alert severity="error" className="mb-5">
          {displayError}
        </Alert>
      )}

      <form className="flex flex-col gap-5" onSubmit={onPasswordSubmit}>
        <TextField
          {...passwordForm.register('email')}
          type="email"
          label="Email Address"
          placeholder="you@company.com"
          autoComplete="email"
          disabled={isLoading}
          error={!!passwordForm.formState.errors.email}
          helperText={passwordForm.formState.errors.email?.message}
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

        <TextField
          {...passwordForm.register('password')}
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={isLoading}
          error={!!passwordForm.formState.errors.password}
          helperText={passwordForm.formState.errors.password?.message}
          fullWidth
          InputProps={{
            sx: { height: 44 },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <VisibilityOff fontSize="small" />
                  ) : (
                    <Visibility fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <div className="flex items-center justify-between -mt-1">
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={passwordForm.watch('rememberMe')}
                onChange={(e) => passwordForm.setValue('rememberMe', e.target.checked)}
              />
            }
            label={<MUITypography variant="body">Remember me</MUITypography>}
          />
          <Link href={ROUTES.AUTH.FORGOT_PASSWORD} className="no-underline">
            <MUITypography variant="body" color="primary">
              Forgot password?
            </MUITypography>
          </Link>
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
              Signing in...
            </span>
          ) : (
            'Log In'
          )}
        </Button>
      </form>

      <div className="flex items-center my-6">
        <div className="flex-1 border-t border-border-light" />
        <MUITypography variant="finePrint" className="px-3">
          or
        </MUITypography>
        <div className="flex-1 border-t border-border-light" />
      </div>

      <div className="text-center">
        <MUITypography variant="body">
          Don&apos;t have an account?{' '}
          <Link href={ROUTES.AUTH.REGISTER} className="no-underline">
            <MUITypography variant="body" color="primary" component="span">
              Contact your administrator
            </MUITypography>
          </Link>
        </MUITypography>
      </div>
    </div>
  );
}
