import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../contexts';
import { Button, Card } from '../components';
import { Colors, Typography, Spacing } from '../constants/theme';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const menuItems = [
    { icon: '👤', title: 'Edit Profile', subtitle: 'Update your information' },
    { icon: '⚙️', title: 'Settings', subtitle: 'App preferences' },
    { icon: '🔔', title: 'Notifications', subtitle: 'Manage notifications' },
    { icon: '🔒', title: 'Privacy', subtitle: 'Privacy settings' },
    { icon: '❓', title: 'Help & Support', subtitle: 'Get help' },
    { icon: 'ℹ️', title: 'About', subtitle: 'App information' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        {user?.role && <Text style={styles.role}>{user.role}</Text>}
      </View>

      <View style={styles.content}>
        {menuItems.map((item, index) => (
          <Card key={index} style={styles.menuCard} variant="outlined">
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </Card>
        ))}

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          fullWidth
          style={styles.logoutButton}
        />

        <Text style={styles.version}>Version 0.0.1</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  name: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSize.md,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  role: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textInverse,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  content: {
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  menuCard: {
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs / 2,
  },
  menuArrow: {
    fontSize: 24,
    color: Colors.textLight,
  },
  logoutButton: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  version: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
