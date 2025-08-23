import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring 
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';

interface TaskSelectButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  taskTitle?: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function TaskSelectButton({ 
  onPress, 
  loading = false, 
  disabled = false,
  taskTitle = 'task'
}: TaskSelectButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withTiming(0.98, { duration: 100 });
    opacity.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptics();
    onPress();
  };

  const isInteractive = !disabled && !loading;

  return (
    <AnimatedTouchableOpacity
      style={[styles.container, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!isInteractive}
      activeOpacity={0.9}
      accessibilityLabel={`Select task: ${taskTitle}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive }}
    >
      {isInteractive ? (
        <LinearGradient
          colors={['#0047FF', '#0021A5']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Text style={styles.buttonText}>Select Task</Text>
              <ChevronRight size={18} color={Colors.white} strokeWidth={2.5} />
            </>
          )}
        </LinearGradient>
      ) : (
        <View style={styles.disabledBackground}>
          <Text style={styles.disabledText}>Select Task</Text>
          <ChevronRight size={18} color="#F8FAFC" strokeWidth={2} />
        </View>
      )}
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginHorizontal: 12,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  disabledBackground: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A0A7B3',
    opacity: 0.6,
    paddingHorizontal: 16,
    gap: 6,
  },
  disabledText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    opacity: 0.7,
    letterSpacing: 0.2,
  },
});