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
  Gated,
  NavBadgeVariant,
  StatusDotColor,
} from './navigation';

export { defaultPathMatcher, exactPathMatcher, annotateAccess, hasAccess } from './navigation';

// Navigation counts types
export type {
  CrmCounts,
  QuotesCounts,
  ProjectsCounts,
  InventoryCounts,
  FinanceCounts,
  TaskCounts,
  NavigationCounts,
  NavigationCountsState,
} from './navigation-counts';

export { DEFAULT_NAVIGATION_COUNTS } from './navigation-counts';
