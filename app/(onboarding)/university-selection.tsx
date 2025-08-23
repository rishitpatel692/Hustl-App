import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Lock, MapPin } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withRepeat,
  withSequence,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';

const { width, height } = Dimensions.get('window');

interface UniversityCard {
  id: string;
  name: string;
  shortName: string;
  enabled: boolean;
  logo: any;
}

const universities: UniversityCard[] = [
  { 
    id: 'uf', 
    name: 'University of Florida', 
    shortName: 'UF', 
    enabled: true,
    logo: require('../../src/assets/images/Florida_Gators_gator_logo.png')
  },
  { 
    id: 'ucf', 
    name: 'University of Central Florida', 
    shortName: 'UCF', 
    enabled: false,
    logo: require('../../src/assets/images/141-1415685_ucf-university-of-central-florida-logo.jpg')
  },
  { 
    id: 'usf', 
    name: 'University of South Florida', 
    shortName: 'USF', 
    enabled: false,
    logo: require('../../src/assets/images/UniversityOfSouthFlorida-logo-350x350.jpg')
  },
  { 
    id: 'fsu', 
    name: 'Florida State University', 
    shortName: 'FSU', 
    enabled: false,
    logo: require('../../src/assets/images/Florida_State_Seminoles_logo.png')
  },
];

// Glowing logo animation
const GlowingLogo = () => {
  const glowOpacity = useSharedValue(0.3);
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    // Gentle glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Subtle shimmer sweep
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const animatedShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerPosition.value, [0, 1], [-120, 120]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View style={[styles.logoContainer, animatedGlowStyle]}>
      <View style={styles.logoWrapper}>
        <Image
          source={require('../../src/assets/images/image.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]} />
      </View>
    </Animated.View>
  );
};

// University carousel component
const UniversityCarousel = () => {
  const scrollX = useSharedValue(0);

  useEffect(() => {
    // Auto-scroll carousel
    scrollX.value = withRepeat(
      withTiming(universities.length * 100, { 
        duration: 8000, 
        easing: Easing.linear 
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value % (universities.length * 100),
      [0, universities.length * 100],
      [0, -universities.length * 100]
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.carouselContainer}>
      <View style={styles.carouselTrack}>
        <Animated.View style={[styles.carouselContent, animatedStyle]}>
          {/* Render universities twice for seamless loop */}
          {[...universities, ...universities].map((university, index) => (
            <View key={`${university.id}-${index}`} style={styles.universityItem}>
              <View style={styles.universityLogoContainer}>
                <Image
                  source={university.logo}
                  style={styles.universityLogo}
                  resizeMode="contain"
                />
                {!university.enabled && (
                  <View style={styles.lockOverlay}>
                    <Lock size={16} color={Colors.white} strokeWidth={2} />
                  </View>
                )}
              </View>
              <Text style={styles.universityName}>{university.shortName}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
};

export default function UniversitySelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);

  useEffect(() => {
    // Staggered entrance animations
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 300 });

    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(400, withSpring(0, { damping: 15 }));

    contentOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    contentTranslateY.value = withDelay(800, withSpring(0, { damping: 15 }));
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleUniversitySelect = (university: UniversityCard) => {
    if (!university.enabled) {
      Alert.alert('Coming Soon', 'This university will be available soon!');
      return;
    }
    
    if (university.id === 'uf') {
      setSelectedId(university.id);
      // Delay navigation to show animation
      setTimeout(() => {
        router.push('/(auth)/welcome');
      }, 300);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const UniversityCardComponent = ({ university }: { university: UniversityCard }) => {
    const scale = useSharedValue(1);
    const logoTranslateX = useSharedValue(0);
    const titleTranslateX = useSharedValue(0);
    const arrowOpacity = useSharedValue(0);
    const arrowScale = useSharedValue(0.8);

    const animatedCardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const animatedLogoStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: logoTranslateX.value }],
    }));

    const animatedTitleStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: titleTranslateX.value }],
    }));

    const animatedArrowStyle = useAnimatedStyle(() => ({
      opacity: arrowOpacity.value,
      transform: [{ scale: arrowScale.value }],
    }));

    const handlePressIn = () => {
      if (!university.enabled) return;
      scale.value = withTiming(0.98, { duration: 100 });
    };

    const handlePressOut = () => {
      if (!university.enabled) return;
      scale.value = withTiming(1, { duration: 100 });
    };

    const handlePress = () => {
      if (!university.enabled) {
        Alert.alert('Coming Soon', 'This university will be available soon!');
        return;
      }
      
      // Trigger selection animation
      logoTranslateX.value = withTiming(-8, { duration: 250 });
      titleTranslateX.value = withTiming(8, { duration: 250 });
      arrowOpacity.value = withTiming(1, { duration: 250 });
      arrowScale.value = withSpring(1, { damping: 15 });
      
      handleUniversitySelect(university);
    };

    const isSelected = selectedId === university.id;
    const cardStyle = [
      styles.universityCard,
      !university.enabled && styles.disabledCard,
      isSelected && styles.selectedCard,
    ];

    return (
      <Animated.View style={animatedCardStyle}>
        <TouchableOpacity
          style={cardStyle}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityLabel={
            university.enabled 
              ? `Select ${university.name}` 
              : `${university.name} - Coming Soon`
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: !university.enabled }}
        >
          <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
            <Image
              source={university.logo}
              style={styles.universityLogo}
              resizeMode="contain"
            />
            {!university.enabled && (
              <View style={styles.lockOverlay}>
                <Lock size={20} color={Colors.white} strokeWidth={2} />
              </View>
            )}
          </Animated.View>
          
          <View style={styles.cardContent}>
            <Animated.View style={animatedTitleStyle}>
              <Text style={[
                styles.universityName,
                !university.enabled && styles.disabledText
              ]}>
                {university.name}
              </Text>
              {!university.enabled && (
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              )}
            </Animated.View>
            
            {university.enabled && (
              <Animated.View style={[styles.arrowContainer, animatedArrowStyle]}>
                <View style={styles.arrowPill}>
                  <ChevronRight size={16} color={Colors.primary} strokeWidth={2.5} />
                </View>
              </Animated.View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background with gradient overlay */}
      <View style={styles.backgroundContainer}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/1595391/pexels-photo-1595391.jpeg?auto=compress&cs=tinysrgb&w=800' }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0, 33, 165, 0.85)', 'rgba(250, 70, 22, 0.75)']}
          style={styles.backgroundOverlay}
        />
      </View>

      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View style={[styles.logoSection, animatedLogoStyle]}>
          <GlowingLogo />
        </Animated.View>

        {/* Title Section */}
        <Animated.View style={[styles.titleSection, animatedTitleStyle]}>
          <Text style={styles.title}>Select your university</Text>
          <Text style={styles.subtitle}>
            Choose your campus to connect with your community
          </Text>
        </Animated.View>

        {/* University Grid */}
        <Animated.View style={[styles.universitiesSection, animatedContentStyle]}>
          <View style={styles.universitiesGrid}>
            {universities.map((university) => (
              <UniversityCardComponent key={university.id} university={university} />
            ))}
          </View>
          
          <View style={styles.moreUniversities}>
            <UniversityCarousel />
            <Text style={styles.moreText}>More universities coming soon...</Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, animatedContentStyle, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => console.log('Terms pressed')}>
            <Text style={styles.legalText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => console.log('Privacy pressed')}>
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.copyrightText}>
          © 2025 HUSTLU LLC. All Rights Reserved.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: height * 0.05, // Reduced top padding
  },
  logoSection: {
    alignItems: 'center',
    paddingBottom: 24, // Reduced padding
  },
  logoContainer: {
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: width * 0.1,
  },
  logo: {
    width: width * 0.2, // Smaller logo
    height: width * 0.2,
    maxWidth: 80,
    maxHeight: 80,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -120,
    width: 120,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32, // Reduced margin
  },
  title: {
    fontSize: 28, // Slightly smaller
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  universitiesSection: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  universitiesGrid: {
    gap: 12,
    marginBottom: 24,
  },
  universityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedCard: {
    backgroundColor: 'rgba(0, 56, 255, 0.1)',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  disabledCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    opacity: 0.7,
  },
  logoContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  universityLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  universityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    lineHeight: 22,
  },
  disabledText: {
    color: Colors.semantic.tabInactive,
  },
  comingSoonText: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
    marginTop: 2,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrowPill: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreUniversities: {
    alignItems: 'center',
    gap: 16,
  },
  carouselContainer: {
    height: 60,
    marginBottom: 12,
    overflow: 'hidden',
  },
  carouselTrack: {
    width: width,
    height: 60,
    overflow: 'hidden',
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  universityItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 60,
    gap: 6,
  },
  universityLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  universityName: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  moreText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  legalText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legalSeparator: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.6,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.7,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});