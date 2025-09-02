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
    backgroundColor: Colors.white,
    paddingTop: 20,
    paddingBottom: 12,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  button: {
    backgroundColor: Colors.semantic.primaryButton,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 52,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  disabledButton: {
    backgroundColor: Colors.semantic.tabInactive,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonText: {
    color: Colors.semantic.tabInactive,
  },
});