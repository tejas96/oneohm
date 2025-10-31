import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Add other auth screens here */}
      {/* <Stack.Screen name="Signup" component={SignupScreen} /> */}
      {/* <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /> */}
    </Stack.Navigator>
  );
};
