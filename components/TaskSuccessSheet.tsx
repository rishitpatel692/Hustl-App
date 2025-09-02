import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, X } from 'lucide-react-native';
// import Animated, { 
//   useSharedValue, 
//   useAnimatedStyle, 
//   withSpring, 
//   withTiming, 
//   withSequence,
//   runOnJS
// } from 'react-native-reanimated'; // Temporarily disabled for Expo Go
import { Colors } from '@/theme/colors';
import Toast from './Toast';

const { width, height } = Dimensions.get('window');

interface TaskSuccessSheetProps {
  visible: boolean;
  onClose: () => void;
  taskId?: string;
}

// Simple confetti particle component
const ConfettiParticle = ({ delay, color }: { delay: number; color: string }) => {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  useEffect(() => {
    const startAnimation = () => {
      // Random horizontal movement
      const randomX = (Math.random() - 0.5) * 200;
      const randomRotation = Math.random() * 720;
      
      opacity.value = withTiming(1, { duration: 100 });
      translateY.value = withTiming(height + 100, { duration: 1800 });
      translateX.value = withTiming(randomX, { duration: 1800 });
      rotate.value = withTiming(randomRotation, { duration: 1800 });
      
      // Fade out near the end
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
      }, 1500);
    };

    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.confettiParticle, { backgroundColor: color }, animatedStyle]} />
  );
};

// Confetti component with multiple particles
const ConfettiAnimation = ({ show }: { show: boolean }) => {
  const confettiColors = [
    Colors.primary,
    Colors.secondary,
    '#FFD700', // Gold
    '#FF69B4', // Pink
    '#00CED1', // Turquoise
  ];

  if (!show) return null;

  return (
    <View style={styles.confettiContainer}>
      {Array.from({ length: 30 }).map((_, index) => (
        <ConfettiParticle
          key={index}
          delay={index * 60} // Stagger the particles
          color={confettiColors[index % confettiColors.length]}
        />
      ))}
    </View>
  );
};

export default function TaskSuccessSheet({ visible, onClose, taskId }: TaskSuccessSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // const scale = useSharedValue(0.8);
  // const opacity = useSharedValue(0);
  // const iconScale = useSharedValue(0);
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ''
  });

  // const animatedContainerStyle = useAnimatedStyle(() => ({
  //   transform: [{ scale: scale.value }],
  //   opacity: opacity.value,
  // }));

  // const animatedIconStyle = useAnimatedStyle(() => ({
  //   transform: [{ scale: iconScale.value }],
  // }));

  useEffect(() => {
    // Animations temporarily disabled for Expo Go stability
  }, [visible]);

  const handleViewMyPosts = () => {
    onClose();
    router.push('/(tabs)/tasks');
    
    // Show toast after navigation
    setTimeout(() => {
      setToast({
        visible: true,
        message: 'Task posted successfully.'
      });
    }, 500);
  };

  const handleBrowseTasks = () => {
    onClose();
    router.push('/(tabs)/tasks');
    
    // Show toast after navigation
    setTimeout(() => {
      setToast({
        visible: true,
        message: 'Task posted successfully.'
      });
    }, 500);
  };

  const handleClose = () => {
    onClose();
    
    // Show toast
    setTimeout(() => {
      setToast({
        visible: true,
        message: 'Task posted successfully.'
      });
    }, 300);
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        accessibilityViewIsModal
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 32 }]}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={20} color={Colors.muted.foreground} strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={styles.content}>
              <View style={styles.heroIcon}>
                <Zap size={32} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
              </View>
              
              <Text style={styles.title}>You hustled it!</Text>
              <Text style={styles.subtitle}>
                Sit back — another student will take care of it for you.
              </Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={handleViewMyPosts}
                  accessibilityRole="button"
                  accessibilityLabel="View My Posts"
                >
                  <Text style={styles.primaryButtonText}>View My Posts</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  onPress={handleBrowseTasks}
                  accessibilityRole="button"
                  accessibilityLabel="Browse Tasks"
                >
                  <Text style={styles.secondaryButtonText}>Browse Tasks</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.textButton} 
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={styles.textButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={hideToast}
        duration={2000}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  confettiParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: height * 0.3,
    left: width * 0.5,
  },
  sheet: {
    backgroundColor: Colors.semantic.screen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingHorizontal: 24,
    minHeight: height * 0.5,
    maxHeight: height * 0.8,
    zIndex: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  content: {
    alignItems: 'center',
    paddingTop: 20,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: Colors.semantic.primaryButton,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  textButton: {
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  textButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.semantic.tabInactive,
  },
});