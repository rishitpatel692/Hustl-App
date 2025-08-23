import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
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
  withSpring
} from 'react-native-reanimated';
import { Colors } from '@constants/Colors';
import GlobalHeader from '@components/GlobalHeader';

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

// Animated Referral Banner Component
const AnimatedReferralsBanner = () => {
  const router = useRouter();
  const glowAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  React.useEffect(() => {
    // Glow animation
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );

    // Pulse animation for button
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(glowAnimation.value, [0, 1], [0.2, 0.6]);
    return {
      shadowOpacity: opacity,
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const handleInvitePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    // TODO: Open share sheet
    console.log('Invite pressed');
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
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Category Card Component
const CategoryCard = ({ category, index, onPress }: { category: any; index: number; onPress: () => void }) => {
  const scaleAnimation = useSharedValue(0.8);
  const opacityAnimation = useSharedValue(0);

  // Staggered entrance animation
  React.useEffect(() => {
    const delay = index * 100;
    
    opacityAnimation.value = withDelay(delay, withTiming(1, { duration: 600 }));
    scaleAnimation.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 300 }));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
    opacity: opacityAnimation.value,
  }));

  const handlePressIn = () => {
    scaleAnimation.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scaleAnimation.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    scaleAnimation.value = withSequence(
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 100 })
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
        <View style={styles.categoryOverlay} />
        <View style={styles.categoryContent}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const router = useRouter();

  const handleCategoryPress = (categoryId: string) => {
    // Navigate to Post Task with category prefill
    router.push({
      pathname: '/(tabs)/post',
      params: { category: categoryId }
    });
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Animated Referral Banner */}
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
    backgroundColor: '#0A0F1C', // Deep navy background
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for tab bar
  },
  
  // Animated Referral Card
  referralCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 20,
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 20,
    background: 'linear-gradient(135deg, #0021A5 0%, #0A0F1C 100%)',
    backgroundColor: '#0021A5', // Fallback for React Native
  },
  referralTextContainer: {
    flex: 1,
    gap: 8,
  },
  referralTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9', // Light gray-white
    lineHeight: 24,
  },
  referralSubtitle: {
    fontSize: 14,
    color: '#A0A7B3', // Lighter gray
    lineHeight: 20,
  },
  inviteButton: {
    backgroundColor: '#FA4616', // UF Orange
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
  },

  // Categories Section
  categoriesSection: {
    paddingHorizontal: 20,
  },
  categoriesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9', // White text
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  categoriesSubtitle: {
    fontSize: 16,
    color: '#A0A7B3', // Light gray
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  
  // Category Cards - Reference Design Style
  categoryCard: {
    width: '47%',
    marginBottom: 16,
  },
  categoryButton: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Fallback for React Native
  },
  categoryContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9', // White text
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});