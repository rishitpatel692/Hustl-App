import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, Share2, Gift, Users, DollarSign, Award, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { Shadows, Typography, Spacing, BorderRadius } from '@/theme/colors';
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
    backgroundColor: Colors.semantic.background,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.displayMedium,
    color: Colors.semantic.textPrimary,
  },
  headerSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textSecondary,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadows.large,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  balanceTitle: {
    ...Typography.h2,
    color: Colors.semantic.textPrimary,
  },
  balanceAmount: {
    ...Typography.displayLarge,
    color: Colors.semantic.primary,
  },
  balanceLabel: {
    ...Typography.labelMedium,
    color: Colors.semantic.textTertiary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.semantic.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    ...Shadows.small,
  },
  statValue: {
    ...Typography.h2,
    color: Colors.semantic.textPrimary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h1,
    color: Colors.semantic.textPrimary,
    marginBottom: Spacing.lg,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    ...Shadows.small,
  },
  linkText: {
    flex: 1,
    ...Typography.bodyMedium,
    color: Colors.semantic.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  inviteButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.large,
  },
  inviteButtonContainer: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxxl,
  },
  inviteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
    minHeight: 56,
  },
  inviteButtonText: {
    ...Typography.labelLarge,
    color: Colors.white,
  },
  stepsContainer: {
    gap: Spacing.xl,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xl,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    ...Shadows.small,
  },
  stepContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  stepTitle: {
    ...Typography.h3,
    color: Colors.semantic.textPrimary,
  },
  stepDescription: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textSecondary,
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxxxl,
    gap: Spacing.xs,
  },
  termsText: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
    textDecorationLine: 'underline',
  },
});