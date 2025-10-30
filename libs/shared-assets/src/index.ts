// Shared assets (constants, config, etc.)
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

export const APP_CONFIG = {
  APP_NAME: 'OneOhm EPC',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@oneohm.com',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
};

// Add image assets, icons, etc. here
export const ASSETS = {
  LOGO: '/assets/logo.png',
  FAVICON: '/assets/favicon.ico',
};
