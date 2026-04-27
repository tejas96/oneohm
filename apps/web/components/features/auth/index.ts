// Auth Feature - Barrel Exports

// Components (UI only)
export { LoginForm } from './components/login-form';
export { OtpVerifyForm } from './components/otp-verify-form';
export { ForgotPasswordForm } from './components/forgot-password-form';
export { ForgotPasswordOtpForm } from './components/forgot-password-otp-form';
export { ResetPasswordForm } from './components/reset-password-form';

// Hooks (Logic only)
export {
  useLoginForm,
  useOtpVerify,
  useForgotPassword,
  useForgotPasswordOtp,
  useResetPassword,
  type UseLoginFormReturn,
  type UseOtpVerifyReturn,
  type UseForgotPasswordReturn,
  type UseForgotPasswordOtpReturn,
  type UseResetPasswordReturn,
  type PasswordStrength,
} from './hooks';

// Schemas
export {
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  forgotPasswordByPhoneSchema,
  resetPasswordSchema,
  type LoginFormData,
  type OtpRequestFormData,
  type OtpVerifyFormData,
  type ForgotPasswordFormData,
  type ForgotPasswordByPhoneFormData,
  type ResetPasswordFormData,
} from './schemas/auth.schema';
