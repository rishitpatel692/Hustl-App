import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Colors } from '@/theme/colors';

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
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: Colors.semantic.screen,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    backgroundColor: Colors.semantic.primaryButton,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  disabledButton: {
    backgroundColor: Colors.muted,
  },
  disabledButtonText: {
    color: Colors.semantic.tabInactive,
  },
});