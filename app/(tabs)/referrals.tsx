import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, Share2, Gift, Users, DollarSign, Award, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import GlobalHeader from '@/components/GlobalHeader';
import Toast from '@components/Toast';

const howItWorksSteps = [
  {
    icon: <Share2 size={24} color={Colors.primary} strokeWidth={2} />,
    title: 'Share your link',
    description: 'Send your unique referral link to friends via text, social media, or in person.',
  },
  {
    icon: <Users size={24} color={Colors.primary} strokeWidth={2} />,
    title: 'Friend signs up',
    description: 'Your friend creates an account using your referral link and gets verified.',
  },
  {
    icon: <DollarSign size={24} color={Colors.primary} strokeWidth={2} />,
    title: 'Earn credits',
    description: 'Get $10 in credits when your friend completes their first task successfully.',
  },
];

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ''
  });

  // Mock data - replace with real data later
  const referralStats = {
    balance: 0,
    referred: 0,
    discounts: 0,
    credits: 0,
  };

  const referralLink = user ? `https://hustl.app/ref/${user.id}` : 'https://hustl.app/ref/demo';

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleCopyLink = async () => {
    triggerHaptics();
    
    try {
      await Clipboard.setStringAsync(referralLink);
      setToast({
        visible: true,
        message: 'Referral link copied!'
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleInviteFriends = async () => {
    triggerHaptics();

    try {
      await Clipboard.setStringAsync(referralLink);
      setToast({
        visible: true,
        message: 'Referral link copied!'
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setToast({
        visible: true,
        message: 'Failed to copy link'
      });
    }
  };

  const handleTermsPress = () => {
    console.log('Terms pressed');
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <>
      <View style={styles.container}>
        <GlobalHeader showSearch={false} showNotifications={false} />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Referrals</Text>
            <Text style={styles.headerSubtitle}>
              Earn credits by inviting friends to Hustl
            </Text>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Gift size={32} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.balanceTitle}>Your Credits</Text>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(referralStats.balance * 100)}
            </Text>
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Users size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.statValue}>{referralStats.referred}</Text>
              <Text style={styles.statLabel}>Referred</Text>
            </View>
            
            <View style={styles.statCard}>
              <Award size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.statValue}>{formatCurrency(referralStats.discounts * 100)}</Text>
              <Text style={styles.statLabel}>Discounts</Text>
            </View>
            
            <View style={styles.statCard}>
              <DollarSign size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.statValue}>{formatCurrency(referralStats.credits * 100)}</Text>
              <Text style={styles.statLabel}>Credits</Text>
            </View>
          </View>

          {/* Referral Link */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Referral Link</Text>
            <View style={styles.linkContainer}>
              <Text style={styles.linkText} numberOfLines={1}>
                {referralLink}
              </Text>
              <TouchableOpacity 
                style={styles.copyButton} 
                onPress={handleCopyLink}
                accessibilityLabel="Copy referral link"
                accessibilityRole="button"
              >
                <Copy size={16} color={Colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Invite Button */}
          <View style={styles.inviteButtonContainer}>
            <TouchableOpacity 
              style={styles.inviteButton} 
              onPress={handleInviteFriends}
              accessibilityLabel="Copy referral link"
              accessibilityRole="button"
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0047FF', '#0021A5', '#FA4616']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.7, 1]}
                style={styles.inviteButtonGradient}
              >
                <Copy size={20} color={Colors.white} strokeWidth={2} />
                <Text style={styles.inviteButtonText}>Copy Invite Link</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* How It Works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <View style={styles.stepsContainer}>
              {howItWorksSteps.map((step, index) => (
                <View key={index} style={styles.stepCard}>
                  <View style={styles.stepIconContainer}>
                    {step.icon}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Terms */}
          <TouchableOpacity 
            style={styles.termsButton} 
            onPress={handleTermsPress}
            accessibilityLabel="View terms and conditions"
            accessibilityRole="button"
          >
            <Text style={styles.termsText}>Terms & Conditions</Text>
            <ExternalLink size={14} color={Colors.semantic.tabInactive} strokeWidth={2} />
          </TouchableOpacity>
        </ScrollView>
      </View>

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
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  balanceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    letterSpacing: -0.2,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -1,
  },
  balanceLabel: {
    fontSize: 15,
    color: Colors.semantic.tabInactive,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.semantic.card,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 16,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.mutedDark,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: Colors.semantic.bodyText,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  inviteButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  inviteButtonContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  inviteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 16,
    minHeight: 60,
  },
  inviteButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stepsContainer: {
    gap: 20,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  stepIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.mutedDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  stepContent: {
    flex: 1,
    gap: 8,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    letterSpacing: -0.2,
  },
  stepDescription: {
    fontSize: 15,
    color: Colors.semantic.tabInactive,
    lineHeight: 22,
    fontWeight: '500',
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 24,
    marginBottom: 40,
    gap: 6,
  },
  termsText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textDecorationLine: 'underline',
  },
});