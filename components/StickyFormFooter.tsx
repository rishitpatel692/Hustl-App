import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Colors } from '@/theme/colors';
import { Shadows, Typography, Spacing, BorderRadius } from '@/theme/colors';

interface StickyFormFooterProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  isValid: boolean;
  buttonText?: string;
}

export default function StickyFormFooter({ 
  onSubmit, 
  isSubmitting, 
  isValid, 
  buttonText = "Post Task" 
}: StickyFormFooterProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={[
      styles.footer,
      {
        bottom: tabBarHeight + insets.bottom + 12,
      }
    ]}>
      <TouchableOpacity
        style={[
          styles.button,
          (!isValid || isSubmitting) && styles.disabledButton
        ]}
        onPress={onSubmit}
        disabled={!isValid || isSubmitting}
        accessibilityRole="button"
        accessibilityLabel={buttonText}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={[
            styles.buttonText,
            (!isValid || isSubmitting) && styles.disabledButtonText
          ]}>
            {buttonText}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 100,
    backgroundColor: Colors.white,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.borderLight,
    ...Shadows.large,
    borderRadius: BorderRadius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  button: {
    backgroundColor: Colors.semantic.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: 56,
    ...Shadows.medium,
  },
  buttonText: {
    ...Typography.labelLarge,
    color: Colors.white,
  },
  disabledButton: {
    backgroundColor: Colors.gray300,
  },
  disabledButtonText: {
    color: Colors.gray500,
  },
});