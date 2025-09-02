import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, MapPin } from 'lucide-react-native';
// import Animated, { 
//   useSharedValue, 
//   useAnimatedStyle, 
//   withSpring, 
//   withDelay, 
//   withTiming, 
//   withRepeat,
//   withSequence,
//   interpolate,
//   Easing
// } from 'react-native-reanimated'; // Temporarily disabled for Expo Go
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';

const { width, height } = Dimensions.get('window');

// Glowing logo animation
const GlowingLogo = () => {
  // const glowOpacity = useSharedValue(0.3);
  // const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    // Animation temporarily disabled for Expo Go stability
  }, []);

  // const animatedGlowStyle = useAnimatedStyle(() => ({
  //   shadowOpacity: glowOpacity.value,
  // }));

  // const animatedShimmerStyle = useAnimatedStyle(() => {
  //   const translateX = interpolate(shimmerPosition.value, [0, 1], [-120, 120]);
  //   return {
  //     transform: [{ translateX }],
  //   };
  // });

  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoWrapper}>
        <Image
          source={require('../../assets/images/image.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

// University carousel component
const UniversityCarousel = () => {
  // const scrollX = useSharedValue(0);
  const universities = [
    { id: 'uf', name: 'UF', logo: require('../../assets/images/Florida_Gators_gator_logo.png') },
    { id: 'ucf', name: 'UCF', logo: require('../../assets/images/141-1415685_ucf-university-of-central-florida-logo.jpg') },
    { id: 'usf', name: 'USF', logo: require('../../assets/images/UniversityOfSouthFlorida-logo-350x350.jpg') },
    { id: 'fsu', name: 'FSU', logo: require('../../assets/images/Florida_State_Seminoles_logo.png') },
  ];

  useEffect(() => {
    // Animation temporarily disabled for Expo Go stability
  }, []);

  // const animatedStyle = useAnimatedStyle(() => {
  //   const translateX = interpolate(
  //     scrollX.value % (universities.length * 100),
  //     [0, universities.length * 100],
  //     [0, -universities.length * 100]
  //   );
  //   return {
  //     transform: [{ translateX }],
  //   };
  // });

  return (
    <View style={styles.carouselContainer}>
      <View style={styles.carouselTrack}>
        <View style={styles.carouselContent}>
          {/* Render universities twice for seamless loop */}
          {universities.map((university, index) => (
            <View key={`${university.id}-${index}`} style={styles.universityItem}>
              <View style={styles.universityLogoContainer}>
                <Image
                  source={university.logo}
                  style={styles.universityLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.universityName}>{university.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// Pulsing button animation
// const PulsingButton = ({ children, onPress, style }: { 
//   children: React.ReactNode; 
//   onPress: () => void; 
//   style?: any;
// }) => {
//   // Animation temporarily disabled for Expo Go stability
//   return (
//     <View style={style}>
//       <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
//         {children}
//       </TouchableOpacity>
//     </View>
//   );
// };

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Animation values - temporarily disabled for Expo Go stability
  // const logoOpacity = useSharedValue(0);
  // const logoScale = useSharedValue(0.8);
  // const titleOpacity = useSharedValue(0);
  // const titleTranslateY = useSharedValue(30);
  // const contentOpacity = useSharedValue(0);
  // const contentTranslateY = useSharedValue(40);

  useEffect(() => {
    // Animations temporarily disabled for Expo Go stability
  }, []);

  // const animatedLogoStyle = useAnimatedStyle(() => ({
  //   opacity: logoOpacity.value,
  //   transform: [{ scale: logoScale.value }],
  // }));

  // const animatedTitleStyle = useAnimatedStyle(() => ({
  //   opacity: titleOpacity.value,
  //   transform: [{ translateY: titleTranslateY.value }],
  // }));

  // const animatedContentStyle = useAnimatedStyle(() => ({
  //   opacity: contentOpacity.value,
  //   transform: [{ translateY: contentTranslateY.value }],
  // }));

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
        <View style={styles.logoSection}>
          <GlowingLogo />
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to Hustl!</Text>
          <Text style={styles.welcomeTagline}>
            Your campus. Your network. Your hustle.
          </Text>
          <Text style={styles.welcomeDescription}>
            Select your university to get started with campus tasks, food pickups, and more.
          </Text>
        </View>

        {/* University Carousel */}
        <View style={styles.universitySection}>
          <UniversityCarousel />
          
          <View style={styles.moreUniversities}>
            <View style={styles.moreDots}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
            <Text style={styles.moreText}>Your campus could be next 🚀</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          onPress={handleChooseCampus}
          style={styles.primaryButtonContainer}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#FA4616', '#0021A5']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.primaryButton}
          >
            <MapPin size={20} color={Colors.white} strokeWidth={2} />
            <Text style={styles.primaryButtonText}>Choose Your Campus</Text>
            <ChevronRight size={20} color={Colors.white} strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={handleTerms}>
            <Text style={styles.legalText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={handlePrivacy}>
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    borderRadius: width * 0.15,
  },
  logo: {
    width: width * 0.3,
    height: width * 0.3,
    maxWidth: 120,
    maxHeight: 120,
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
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 60,
  },
  welcomeTitle: {
    fontSize: 38,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.8,
  },
  welcomeTagline: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 28,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: -0.4,
  },
  welcomeDescription: {
    fontSize: 17,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontWeight: '500',
  },
  universitySection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  carouselContainer: {
    height: 100,
    marginBottom: 20,
    overflow: 'hidden',
  },
  carouselTrack: {
    width: width,
    height: 100,
    overflow: 'hidden',
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
  },
  universityItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    gap: 8,
  },
  universityLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  universityLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 28,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 28,
    gap: 16,
    minHeight: 64,
  },
  primaryButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
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