export * from './theme';

export const APP_NAME = 'OneOhm EPC' as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  THEME_MODE: '@theme_mode',
} as const;
