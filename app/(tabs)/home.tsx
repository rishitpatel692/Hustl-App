import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Car, Coffee, Dumbbell, BookOpen, Pizza, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  withDelay,
  withSpring,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@constants/Colors';
import GlobalHeader from '@components/GlobalHeader';

const { width, height } = Dimensions.get('window');

const categories = [
  {
    id: 'car',
    title: 'Car Rides',
    backgroundColor: '#3B82F6',
    image: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'food',
    title: 'Food Pickup',
    backgroundColor: '#FA4616',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'workout',
    title: 'Workout Partner',
    backgroundColor: '#10B981',
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'coffee',
    title: 'Coffee Runs',
    backgroundColor: '#8B4513',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'study',
    title: 'Study Partner',
    backgroundColor: '#8B5CF6',
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'custom',
    title: 'Custom Task',
    backgroundColor: '#6B7280',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

// Floating Particles Component
const FloatingParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const translateY = useSharedValue(height + 50);
    const translateX = useSharedValue(Math.random() * width);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5 + Math.random() * 0.5);

    React.useEffect(() => {
      const startAnimation = () => {
        const delay = i * 800 + Math.random() * 2000;
        const duration = 8000 + Math.random() * 4000;
        
        translateY.value = withDelay(
          delay,
          withRepeat(
            withTiming(-100, { duration, easing: Easing.linear }),
            -1,
            false
          )
        );
        
        opacity.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(0.1 + Math.random() * 0.15, { duration: duration * 0.1 }),
              withTiming(0.1 + Math.random() * 0.15, { duration: duration * 0.8 }),
              withTiming(0, { duration: duration * 0.1 })
            ),
            -1,
            false
          )
        );
      };

      startAnimation();
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        key={i}
        style={[
          styles.particle,
          {
            width: 4 + Math.random() * 8,
            height: 4 + Math.random() * 8,
          },
          animatedStyle
        ]}
      />
    );
  });

  return (
    <View style={styles.particlesContainer}>
      {particles}
    </View>
  );
};

// Enhanced Referral Banner with Gradient and Glow
const AnimatedReferralsBanner = () => {
  const router = useRouter();
  const glowAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const shimmerAnimation = useSharedValue(-1);

  React.useEffect(() => {
    // Glow animation
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500 }),
        withTiming(0, { duration: 2500 })
      ),
      -1,
      true
    );

    // Pulse animation for button
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );

    // Shimmer animation
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0.3, 0.7]);
    return {
      shadowOpacity,
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const animatedShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerAnimation.value, [0, 1], [-100, 300]);
    return {
      transform: [{ translateX }],
    };
  });

  const handleInvitePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push('/(tabs)/referrals');
  };

  const handleBannerPress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push('/(tabs)/referrals');
  };

  return (
    <Animated.View style={[styles.referralCard, animatedGlowStyle]}>
      <TouchableOpacity onPress={handleBannerPress} activeOpacity={0.95}>
        <LinearGradient
          colors={['#0047FF', '#0021A5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.referralGradient}
        >
          <View style={styles.referralContent}>
            <View style={styles.referralTextContainer}>
              <Text style={styles.referralTitle}>Get $10 for every referral!</Text>
              <Text style={styles.referralSubtitle}>
                Invite friends and earn credits when they complete their first task.
              </Text>
            </View>
            
            <Animated.View style={animatedPulseStyle}>
              <TouchableOpacity 
                style={styles.inviteButton} 
                onPress={handleInvitePress}
                activeOpacity={0.8}
              >
                <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]} />
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Enhanced Category Card with Better Animations
const CategoryCard = ({ category, index, onPress }: { category: any; index: number; onPress: () => void }) => {
  const scaleAnimation = useSharedValue(0.8);
  const opacityAnimation = useSharedValue(0);
  const translateY = useSharedValue(20);

  // Staggered entrance animation
  React.useEffect(() => {
    const delay = index * 150;
    
    opacityAnimation.value = withDelay(delay, withTiming(1, { duration: 800 }));
    scaleAnimation.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 300 }));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnimation.value },
      { translateY: translateY.value }
    ],
    opacity: opacityAnimation.value,
  }));

  const handlePressIn = () => {
    scaleAnimation.value = withTiming(0.95, { duration: 150 });
  };

  const handlePressOut = () => {
    scaleAnimation.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    scaleAnimation.value = withSequence(
      withTiming(1.05, { duration: 100 }),
      withSpring(1, { damping: 15 })
    );
    
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    
    onPress();
  };

  return (
    <Animated.View style={[styles.categoryCard, animatedStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.categoryButton}
      >
        <Image
          source={{ uri: category.image }}
          style={styles.categoryImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
          style={styles.categoryOverlay}
        />
        <View style={styles.categoryContent}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCategoryPress = (categoryId: string) => {
    // Navigate to Post Task with category prefill
    router.push({
      pathname: '/(tabs)/post',
      params: { category: categoryId }
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0021A5', '#0047FF']}
        style={styles.backgroundGradient}
      />
      
      {/* Floating Particles */}
      <FloatingParticles />
      
      <GlobalHeader />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Enhanced Referral Banner */}
        <AnimatedReferralsBanner />

        {/* Task Categories Section */}
        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesTitle}>Task Categories</Text>
          <Text style={styles.categoriesSubtitle}>Choose what you need help with</Text>
          
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                index={index}
                onPress={() => handleCategoryPress(category.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for tab bar
  },
  
  // Enhanced Referral Card
  referralCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 20,
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  referralGradient: {
    borderRadius: 20,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  referralTextContainer: {
    flex: 1,
    gap: 8,
  },
  referralTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  referralSubtitle: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    opacity: 0.9,
  },
  inviteButton: {
    backgroundColor: '#FA4616',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Categories Section
  categoriesSection: {
    paddingHorizontal: 20,
    zIndex: 3,
  },
  categoriesTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  categoriesSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    marginBottom: 24,
    opacity: 0.9,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  
  // Enhanced Category Cards
  categoryCard: {
    width: '47%',
    marginBottom: 16,
  },
  categoryButton: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  categoryImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});