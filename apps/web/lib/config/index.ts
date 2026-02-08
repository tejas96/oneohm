/**
 * Configuration Module Exports
 * Central export point for web application configuration
 */

export * from './config.interface';
export { config, WebConfigService } from './config';

// Navigation configuration
export {
  navigationConfig,
  getPanelConfigByPath,
  isNavItemActive,
} from './navigation';
