import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, MapPin } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  withTiming, 
  withRepeat,
  withSequence,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';

const { width, height } = Dimensions.get('window');

// Floating elements animation
const FloatingElement = ({ delay, children }: { delay: number; children: React.ReactNode }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));
    translateY.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

// Pulsing button animation
const PulsingButton = ({ children, onPress, style }: { 
  children: React.ReactNode; 
  onPress: () => void; 
  style?: any;
}) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[animatedGlowStyle, style]}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
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

  const handleChooseCampus = () => {
    router.push('/(onboarding)/university-selection');
  };

  const handleTerms = () => {
    console.log('Terms of Service pressed');
  };

  const handlePrivacy = () => {
    console.log('Privacy Policy pressed');
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

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <Animated.View style={[styles.logoSection, animatedLogoStyle]}>
          <FloatingElement delay={1200}>
            <Image
              source={require('../../src/assets/images/image.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </FloatingElement>
        </Animated.View>

        {/* Welcome Text */}
        <Animated.View style={[styles.welcomeSection, animatedTitleStyle]}>
          <Text style={styles.welcomeTitle}>Welcome to Hustl!</Text>
          <Text style={styles.welcomeTagline}>
            Your campus. Your network. Your hustle.
          </Text>
          <Text style={styles.welcomeDescription}>
            Select your university to get started with campus tasks, food pickups, and more.
          </Text>
        </Animated.View>

        {/* University Preview */}
        <Animated.View style={[styles.universityPreview, animatedContentStyle]}>
          <View style={styles.universityRow}>
            <FloatingElement delay={1600}>
              <View style={styles.universityItem}>
                <Image
                  source={require('../../src/assets/images/Florida_Gators_gator_logo.png')}
                  style={styles.universityLogo}
                  resizeMode="contain"
                />
                <Text style={styles.universityName}>UF</Text>
              </View>
            </FloatingElement>
            
            <FloatingElement delay={1800}>
              <View style={styles.universityItem}>
                <Image
                  source={require('../../src/assets/images/141-1415685_ucf-university-of-central-florida-logo.jpg')}
                  style={styles.universityLogo}
                  resizeMode="contain"
                />
                <Text style={styles.universityName}>UCF</Text>
              </View>
            </FloatingElement>
            
            <FloatingElement delay={2000}>
              <View style={styles.universityItem}>
                <Image
                  source={require('../../src/assets/images/UniversityOfSouthFlorida-logo-350x350.jpg')}
                  style={styles.universityLogo}
                  resizeMode="contain"
                />
                <Text style={styles.universityName}>USF</Text>
              </View>
            </FloatingElement>
            
            <FloatingElement delay={2200}>
              <View style={styles.universityItem}>
                <Image
                  source={require('../../src/assets/images/Florida_State_Seminoles_logo.png')}
                  style={styles.universityLogo}
                  resizeMode="contain"
                />
                <Text style={styles.universityName}>FSU</Text>
              </View>
            </FloatingElement>
          </View>
          
          <View style={styles.moreUniversities}>
            <View style={styles.moreDots}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
            <Text style={styles.moreText}>and more coming soon</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Action Section */}
      <Animated.View style={[styles.bottomSection, animatedContentStyle, { paddingBottom: insets.bottom + 20 }]}>
        <PulsingButton 
          onPress={handleChooseCampus}
          style={styles.primaryButtonContainer}
        >
          <LinearGradient
            colors={['#FA4616', '#0047FF']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.primaryButton}
          >
            <MapPin size={20} color={Colors.white} strokeWidth={2} />
            <Text style={styles.primaryButtonText}>Choose Your Campus</Text>
            <ChevronRight size={20} color={Colors.white} strokeWidth={2.5} />
          </LinearGradient>
        </PulsingButton>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={handleTerms}>
            <Text style={styles.legalText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={handlePrivacy}>
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
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
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  logo: {
    width: width * 0.3,
    height: width * 0.3,
    maxWidth: 120,
    maxHeight: 120,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 60,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  welcomeTagline: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  welcomeDescription: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  universityPreview: {
    alignItems: 'center',
    marginBottom: 40,
  },
  universityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 20,
  },
  universityItem: {
    alignItems: 'center',
    gap: 8,
  },
  universityLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  universityName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  moreUniversities: {
    alignItems: 'center',
    gap: 8,
  },
  moreDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
    opacity: 0.6,
  },
  moreText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    zIndex: 3,
  },
  primaryButtonContainer: {
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
    minHeight: 56,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
});