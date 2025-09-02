import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
// import Animated, { 
//   useSharedValue, 
//   useAnimatedStyle, 
//   withSpring, 
//   withTiming, 
//   runOnJS 
// } from 'react-native-reanimated'; // Temporarily disabled for Expo Go
import { Colors } from '@/theme/colors';

const { width } = Dimensions.get('window');

interface ToastProps {
  visible: boolean;
  message: string;
  onHide: () => void;
  duration?: number;
  type?: 'success' | 'error';
}

export default function Toast({ 
  visible, 
  message, 
  onHide, 
  duration = 3000,
  type = 'success' 
}: ToastProps) {
  const insets = useSafeAreaInsets();
  // const translateY = useSharedValue(-100);
  // const opacity = useSharedValue(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // const animatedStyle = useAnimatedStyle(() => ({
  //   transform: [{ translateY: translateY.value }],
  //   opacity: opacity.value,
  // }));

  useEffect(() => {
    if (visible) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Trigger haptics on show
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(
            type === 'success' 
              ? Haptics.NotificationFeedbackType.Success 
              : Haptics.NotificationFeedbackType.Error
          );
        } catch (error) {
          // Haptics not available, continue silently
        }
      }

      // Show animation
      // opacity.value = withTiming(1, { duration: 300 });
      // translateY.value = withSpring(0, { damping: 15, stiffness: 300 });

      // Auto-hide after duration
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    } else {
      hideToast();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  const hideToast = () => {
    // opacity.value = withTiming(0, { duration: 200 });
    // translateY.value = withTiming(-100, { duration: 200 }, () => {
    //   runOnJS(onHide)();
    // });
    onHide();
  };

  if (!visible) return null;

  const backgroundColor = type === 'success' ? Colors.semantic.successAlert : Colors.semantic.errorAlert;
  const iconColor = Colors.white;

  return (
    <View 
      style={[
        styles.container, 
        { 
          top: insets.top + 16,
          backgroundColor 
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Check size={16} color={iconColor} strokeWidth={2.5} />
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 16,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});