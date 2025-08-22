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
  interpolate
} from 'react-native-reanimated';
import { Colors } from '@constants/Colors';
import GlobalHeader from '@components/GlobalHeader';

const categories = [
  {
    id: 'car',
    title: 'Car Rides',
    icon: <Car size={28} color={Colors.white} strokeWidth={2.5} />,
    backgroundColor: '#3B82F6', // Glowing blue
    gradientColors: ['#60A5FA', '#3B82F6', '#2563EB'],
    image: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'food',
    title: 'Food Pickup',
    icon: <Pizza size={28} color={Colors.white} strokeWidth={2.5} />,
    backgroundColor: '#FF5A1F', // Orange
    gradientColors: ['#FB923C', '#FF5A1F', '#E63A0B'],
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'workout',
    title: 'Workout Partner',
    icon: <Dumbbell size={28} color={Colors.white} strokeWidth={2.5} />,
    backgroundColor: '#10B981', // Green
    gradientColors: ['#34D399', '#10B981', '#059669'],
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'coffee',
    title: 'Coffee Runs',
    icon: <Coffee size={28} color={Colors.white} strokeWidth={2.5} />,
    backgroundColor: '#8B4513', // Brown
    gradientColors: ['#A0522D', '#8B4513', '#654321'],
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'study',
    title: 'Study Partner',
    icon: <BookOpen size={28} color={Colors.white} strokeWidth={2.5} />,
    backgroundColor: '#8B5CF6', // Purple
    gradientColors: ['#A78BFA', '#8B5CF6', '#7C3AED'],
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'custom',
    title: 'Custom Task',
    icon: <Plus size={28} color={Colors.primary} strokeWidth={2.5} />,
    backgroundColor: '#F8FAFC', // Light gray
    gradientColors: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
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
    const opacity = interpolate(glowAnimation.value, [0, 1], [0.3, 0.8]);
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
const CategoryCard = ({ category, onPress }: { category: any; onPress: () => void }) => {
  const scaleAnimation = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
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
        style={[styles.categoryButton, { backgroundColor: category.backgroundColor }]}
      >
        <Image
          source={{ uri: category.image }}
          style={styles.categoryImage}
          resizeMode="cover"
        />
        <View style={styles.categoryOverlay}>
          <View style={styles.categoryIconContainer}>
            {category.icon}
          </View>
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
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
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
    color: Colors.white,
    lineHeight: 24,
  },
  referralSubtitle: {
    fontSize: 14,
    color: Colors.white + 'E6', // 90% opacity
    lineHeight: 20,
  },
  inviteButton: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // Categories Section
  categoriesSection: {
    paddingHorizontal: 20,
  },
  categoriesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 8,
  },
  categoriesSubtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  
  // Category Cards
  categoryCard: {
    width: '47%',
    marginBottom: 16,
  },
  categoryButton: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backdropFilter: 'blur(10px)',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});