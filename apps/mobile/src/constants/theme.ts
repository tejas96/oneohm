export const Colors = {
  // Primary colors
  primary: '#1E88E5',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',

  // Secondary colors
  secondary: '#26A69A',
  secondaryDark: '#00897B',
  secondaryLight: '#4DB6AC',

  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundDark: '#121212',

  // Text colors
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  textInverse: '#FFFFFF',

  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // UI colors
  border: '#E0E0E0',
  divider: '#BDBDBD',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Transparent
  transparent: 'transparent',
};

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 36,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const Layout = {
  window: {
    width: 0, // Will be set dynamically
    height: 0, // Will be set dynamically
  },
  isSmallDevice: false, // Will be set dynamically
};
