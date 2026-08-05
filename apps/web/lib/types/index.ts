// Auth types
export type {
  LoginCredentials,
  OtpRequestData,
  OtpVerifyData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthUser,
  LoginResponse,
  OtpRequestResponse,
  PasswordResetResponse,
  AuthError,
  User,
  ProfileSummary,
} from './auth';

// Navigation types
export type {
  NavItem,
  NavSection,
  RailNavItem,
  PanelConfig,
  NavigationConfig,
  PathMatcher,
  NavBadgeVariant,
  StatusDotColor,
} from './navigation';

export { defaultPathMatcher, exactPathMatcher } from './navigation';

// Navigation counts types
export type {
  CrmCounts,
  QuotesCounts,
  ProjectsCounts,
  InventoryCounts,
  ServiceCounts,
  FinanceCounts,
  TaskCounts,
  NavigationCounts,
  NavigationCountsState,
} from './navigation-counts';

export { DEFAULT_NAVIGATION_COUNTS } from './navigation-counts';
