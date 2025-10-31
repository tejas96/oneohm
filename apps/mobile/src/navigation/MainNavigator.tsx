import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen, ProfileScreen } from '../screens';
import type { MainTabParamList } from './types';
import { Colors, Typography } from '../constants/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screens for tabs
const ProjectsScreen = () => (
  <Text style={{ flex: 1, textAlign: 'center', marginTop: 100 }}>Projects</Text>
);
const NotificationsScreen = () => (
  <Text style={{ flex: 1, textAlign: 'center', marginTop: 100 }}>Notifications</Text>
);

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.textInverse,
        headerTitleStyle: {
          fontWeight: Typography.fontWeight.semibold,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: Typography.fontSize.xs,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="ProjectsTab"
        component={ProjectsScreen}
        options={{
          title: 'Projects',
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🔔</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
