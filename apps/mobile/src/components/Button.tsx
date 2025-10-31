import React from 'react';
import type { TouchableOpacityProps, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      ...styles[`button_${variant}`],
      ...styles[`button_${size}`],
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    if (isDisabled) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    return {
      ...styles.text,
      ...styles[`text_${variant}`],
      ...styles[`text_${size}`],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.primary : Colors.textInverse} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  // Variants
  button_primary: {
    backgroundColor: Colors.primary,
  },
  button_secondary: {
    backgroundColor: Colors.secondary,
  },
  button_outline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  button_text: {
    backgroundColor: Colors.transparent,
  },
  // Sizes
  button_small: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  button_medium: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  button_large: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  // Text styles
  text: {
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  text_primary: {
    color: Colors.textInverse,
  },
  text_secondary: {
    color: Colors.textInverse,
  },
  text_outline: {
    color: Colors.primary,
  },
  text_text: {
    color: Colors.primary,
  },
  text_small: {
    fontSize: Typography.fontSize.sm,
  },
  text_medium: {
    fontSize: Typography.fontSize.md,
  },
  text_large: {
    fontSize: Typography.fontSize.lg,
  },
});
