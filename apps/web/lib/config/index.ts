/**
 * Configuration Module Exports
 * Central export point for web application configuration
 */

export * from './config.interface';
// Navigation configuration
export {
  isNavItemActive,
  isProjectStatusSubItemActive,
  isAllProjectsNavActive,
} from './navigation';

// Routes configuration
export { ROUTES } from './routes';
