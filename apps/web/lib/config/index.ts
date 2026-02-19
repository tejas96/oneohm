/**
 * Configuration Module Exports
 * Central export point for web application configuration
 */

export * from './config.interface';
export { config, WebConfigService } from './config';

// Navigation configuration
export { navigationConfig, getPanelConfigByPath, isNavItemActive } from './navigation';

// Routes configuration
export {
  ROUTES,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  ADMIN_ROUTES,
  buildRoute,
  matchRoute,
  extractParams,
  type RouteParams,
  type RoutePath,
} from './routes';
