import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AuthState,
  User,
  LoginCredentials,
  SignupCredentials,
  UserRole,
} from '@oneohm-epc/shared-types';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Load auth state from storage on mount
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const token = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await storage.getObject<User>(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        setState({
          user: userData,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // TODO: Replace with actual API call
      // Simulating API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUser: User = {
        id: '1',
        email: credentials.email,
        name: 'John Doe',
        role: UserRole.USER,
      };
      const mockToken = 'mock-jwt-token';

      // Save to storage
      await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, mockToken);
      await storage.setObject(STORAGE_KEYS.USER_DATA, mockUser);

      setState({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // TODO: Replace with actual API call
      // Simulating API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUser: User = {
        id: '1',
        email: credentials.email,
        name: credentials.name,
        phone: credentials.phone,
        role: UserRole.USER,
      };
      const mockToken = 'mock-jwt-token';

      // Save to storage
      await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, mockToken);
      await storage.setObject(STORAGE_KEYS.USER_DATA, mockUser);

      setState({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Clear storage
      await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER_DATA);

      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
