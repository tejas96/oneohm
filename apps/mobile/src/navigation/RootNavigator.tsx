import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts';
import { SplashScreen } from '../screens';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash screen for minimum 2 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainNavigator} options={{}} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} options={{}} />
      )}
    </Stack.Navigator>
  );
};
