import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return { ...styles.card, ...Shadows.md };
      case 'outlined':
        return {
          ...styles.card,
          borderWidth: 1,
          borderColor: Colors.border,
        };
      default:
        return styles.card;
    }
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
});
