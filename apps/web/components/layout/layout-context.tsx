'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'oneohm-panel-open';

interface LayoutContextValue {
  isPanelOpen: boolean;
  togglePanel: () => void;
  setIsPanelOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

/**
 * LayoutProvider - Manages layout state (panel open/closed)
 * Persists panel state in localStorage
 */
export function LayoutProvider({ children }: LayoutProviderProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsPanelOpen(stored === 'true');
    }
    setIsHydrated(true);
  }, []);

  // Persist state changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, String(isPanelOpen));
    }
  }, [isPanelOpen, isHydrated]);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  // Keyboard shortcut for panel toggle (Cmd+\)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        togglePanel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel]);

  return (
    <LayoutContext.Provider
      value={{
        isPanelOpen,
        togglePanel,
        setIsPanelOpen,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
