'use client';

import * as React from 'react';

export interface ConfigContextType {
  mapsApiKey?: string;
}

const ConfigContext = React.createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: React.ReactNode;
  value: ConfigContextType;
}

export function ConfigProvider({ children, value }: ConfigProviderProps): React.JSX.Element {
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextType {
  const context = React.useContext(ConfigContext);
  if (!context) {
    return {};
  }
  return context;
}
