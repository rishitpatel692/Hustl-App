import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Car, Coffee, Dumbbell, BookOpen, Pizza, Plus, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
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
import { ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows, Typography, Spacing, BorderRadius } from '@/theme/colors';
import GlobalHeader from '@components/GlobalHeader';

const { width, height } = Dimensions.get('window');

const categories = [
  {
    id: 'food',
    title: 'Food Pickup',
    subtitle: 'Dining halls & restaurants',
    icon: <Pizza size={28} color={Colors.white} strokeWidth={2} />,
    gradient: ['#F97316', '#EA580C'],
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'coffee',
    title: 'Coffee Run',
    subtitle: 'Campus cafes & Starbucks',
    icon: <Coffee size={28} color={Colors.white} strokeWidth={2} />,
    gradient: ['#8B5CF6', '#7C3AED'],
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'car',
    title: 'Campus Rides',
    subtitle: 'Quick transportation',
    icon: <Car size={28} color={Colors.white} strokeWidth={2} />,
    gradient: ['#3B82F6', '#2563EB'],
    image: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'study',
    title: 'Study Partner',
    subtitle: 'Library & group study',
    icon: <BookOpen size={28} color={Colors.white} strokeWidth={2} />,
    gradient: ['#10B981', '#059669'],
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

// Enhanced Referral Banner
const ReferralBanner = () => {
  const router = useRouter();
  const shimmer = useSharedValue(-1);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmer.value, [0, 1], [-100, 300]);
    return { transform: [{ translateX }] };
  });

  return (
    <TouchableOpacity 
      style={styles.referralBanner} 
      onPress={() => router.push('/(tabs)/referrals')}
      activeOpacity={0.95}
    >
      <LinearGradient
        colors={['#0B1426', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.referralGradient}
      >
        <View style={styles.referralContent}>
          <View style={styles.referralText}>
            <Text style={styles.referralTitle}>Earn $10 per referral</Text>
            <Text style={styles.referralSubtitle}>
              Invite friends and earn when they complete tasks
            </Text>
          </View>
          <View style={styles.referralButton}>
            <Text style={styles.referralButtonText}>Invite</Text>
            <ArrowRight size={16} color={Colors.white} strokeWidth={2.5} />
          </View>
        </View>
        <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Enhanced Category Card
const CategoryCard = ({ 
  category, 
  index, 
  onSelectTask,
  isSelecting 
}: { 
  category: any; 
  index: number; 
  onSelectTask: () => void;
  isSelecting: boolean;
}) => {
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    const delay = index * 100;
    opacity.value = withDelay(delay, withSpring(1, { damping: 15 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.categoryCard, animatedStyle]}>
      <TouchableOpacity
        style={styles.categoryTouchable}
        onPress={onSelectTask}
        disabled={isSelecting}
        activeOpacity={0.95}
      >
        <View style={styles.categoryImageContainer}>
          <Image
            source={{ uri: category.image }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.categoryOverlay}
          />
          <View style={styles.categoryIconContainer}>
            {category.icon}
          </View>
        </View>
        
        <View style={styles.categoryContent}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
          
          <TouchableOpacity
            style={[
              styles.selectButton,
              isSelecting && styles.selectButtonLoading
            ]}
            onPress={onSelectTask}
            disabled={isSelecting}
          >
            <LinearGradient
              colors={category.gradient}
              style={styles.selectButtonGradient}
            >
              {isSelecting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.selectButtonText}>Select</Text>
                  <ArrowRight size={14} color={Colors.white} strokeWidth={2.5} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [selectingTaskId, setSelectingTaskId] = useState<string | null>(null);

  const handleSelectTask = async (categoryId: string) => {
    if (selectingTaskId) return;
    
    setSelectingTaskId(categoryId);
    
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {}
    }
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    router.push({
      pathname: '/(tabs)/post',
      params: { category: categoryId }
    });
    
    setSelectingTaskId(null);
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>What can we help with?</Text>
          <Text style={styles.welcomeSubtitle}>
            Choose from popular campus tasks below
          </Text>
        </View>

        {/* Referral Banner */}
        <ReferralBanner />

        {/* Categories Grid */}
        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesTitle}>Popular Categories</Text>
          
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                index={index}
                onSelectTask={() => handleSelectTask(category.id)}
                isSelecting={selectingTaskId === category.id}
              />
            ))}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>2.4k+</Text>
              <Text style={styles.statLabel}>Tasks Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>4.8★</Text>
              <Text style={styles.statLabel}>Average Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>15min</Text>
              <Text style={styles.statLabel}>Avg Response</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  welcomeSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  welcomeTitle: {
    ...Typography.displayMedium,
    color: Colors.semantic.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textSecondary,
    textAlign: 'center',
  },
  referralBanner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xxxl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  referralGradient: {
    position: 'relative',
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xxl,
  },
  referralText: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  referralTitle: {
    ...Typography.h2,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  referralSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.white,
    opacity: 0.9,
  },
  referralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  referralButtonText: {
    ...Typography.labelMedium,
    color: Colors.white,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  categoriesSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  categoriesTitle: {
    ...Typography.h1,
    color: Colors.semantic.textPrimary,
    marginBottom: Spacing.xxl,
  },
  categoriesGrid: {
    gap: Spacing.lg,
  },
  categoryCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.medium,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
  },
  categoryTouchable: {
    flex: 1,
  },
  categoryImageContainer: {
    height: 120,
    position: 'relative',
  },
  categoryImage: {
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
  categoryIconContainer: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white + '20',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  categoryContent: {
    padding: Spacing.xl,
  },
  categoryTitle: {
    ...Typography.h3,
    color: Colors.semantic.textPrimary,
    marginBottom: Spacing.xs,
  },
  categorySubtitle: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
    marginBottom: Spacing.lg,
  },
  selectButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.small,
  },
  selectButtonLoading: {
    opacity: 0.7,
  },
  selectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  selectButtonText: {
    ...Typography.labelMedium,
    color: Colors.white,
  },
  statsSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.semantic.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.small,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
  },
  statNumber: {
    ...Typography.h2,
    color: Colors.semantic.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
    textAlign: 'center',
  },
});