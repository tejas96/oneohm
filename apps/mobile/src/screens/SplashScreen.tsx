import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';
import { APP_NAME } from '../constants';

export const SplashScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{APP_NAME}</Text>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      <Text style={styles.tagline}>Empowering Solar Energy</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  logo: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    marginBottom: Spacing.xl,
  },
  loader: {
    marginVertical: Spacing.lg,
  },
  tagline: {
    fontSize: Typography.fontSize.md,
    color: Colors.textInverse,
    marginTop: Spacing.xl,
  },
});
