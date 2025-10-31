import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts';
import { Card } from '../components';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Projects', value: '12', color: Colors.primary },
    { label: 'Completed', value: '8', color: Colors.success },
    { label: 'In Progress', value: '4', color: Colors.warning },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name || 'Guest'}! 👋</Text>
        <Text style={styles.subtitle}>Welcome to {APP_NAME}</Text>
      </View>

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <Card
            key={index}
            style={[styles.statCard, { borderLeftColor: stat.color }]}
            variant="elevated"
          >
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Card style={styles.actionCard} variant="elevated">
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>📊</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Projects</Text>
              <Text style={styles.actionDescription}>See all your solar projects</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.actionCard} variant="elevated">
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>➕</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>New Project</Text>
              <Text style={styles.actionDescription}>Start a new solar installation</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.actionCard} variant="elevated">
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>📈</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Analytics</Text>
              <Text style={styles.actionDescription}>View performance metrics</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.activityCard} variant="outlined">
          <Text style={styles.activityText}>No recent activity</Text>
        </Card>
      </View>
    </ScrollView>
  );
};

const APP_NAME = 'OneOhm EPC';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginTop: -Spacing.lg,
  },
  statCard: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  actionCard: {
    marginBottom: Spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  actionArrow: {
    fontSize: 24,
    color: Colors.textLight,
  },
  activityCard: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  activityText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
});
