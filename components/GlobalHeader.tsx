import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { Shadows, Typography, Spacing, BorderRadius } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import ProfileSidebar from './ProfileSidebar';

interface GlobalHeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
  title?: string;
}

export default function GlobalHeader({ 
  showSearch = true, 
  showNotifications = true,
  title 
}: GlobalHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();

  const [showProfileSidebar, setShowProfileSidebar] = React.useState(false);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleProfilePress = () => {
    triggerHaptics();
    
    if (isGuest) {
      router.push('/(onboarding)/auth');
      return;
    }
    
    // Open sidebar for authenticated users
    setShowProfileSidebar(true);
  };

  const handleProfileLongPress = () => {
    if (isGuest) return;
    // TODO: Implement quick menu
    console.log('Profile long press - show quick menu');
  };

  const handleSearchPress = () => {
    console.log('Search pressed');
  };

  const handleNotificationsPress = () => {
    console.log('Notifications pressed');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isGuest) {
    return (
      <>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.guestProfileChip}
              onPress={handleProfilePress}
              accessibilityLabel="Sign in"
              accessibilityRole="button"
            >
              <View style={styles.guestAvatar}>
                <Text style={styles.guestAvatarText}>?</Text>
              </View>
            </TouchableOpacity>
            
            <Image
              source={require('../src/assets/images/image.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            
            <View style={styles.rightSection}>
              {showSearch && (
                <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
                  <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        
        {/* Profile Sidebar */}
        <ProfileSidebar
          visible={showProfileSidebar}
          onClose={() => setShowProfileSidebar(false)}
        />
      </>
    );
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <TouchableOpacity
              style={styles.profileChip}
              onPress={handleProfilePress}
              onLongPress={handleProfileLongPress}
              accessibilityLabel="Profile"
              accessibilityRole="button"
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user ? getInitials(user.displayName) : 'U'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <Image
              source={require('../src/assets/images/image.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {title && (
            <Text style={styles.title}>{title}</Text>
          )}

          <View style={styles.rightSection}>
            {showSearch && (
              <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
                <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            )}
            
            {showNotifications && (
              <TouchableOpacity style={styles.iconButton} onPress={handleNotificationsPress}>
                <Bell size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      {/* Profile Sidebar */}
      <ProfileSidebar
        visible={showProfileSidebar}
        onClose={() => setShowProfileSidebar(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.semantic.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.borderLight,
    ...Shadows.small,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    flex: 1,
  },
  profileChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    borderColor: Colors.semantic.primary + '20',
    padding: 2,
    ...Shadows.small,
  },
  guestProfileChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    borderColor: Colors.semantic.textTertiary + '40',
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.semantic.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.semantic.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.labelMedium,
    color: Colors.white,
  },
  guestAvatarText: {
    ...Typography.labelMedium,
    color: Colors.white,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    ...Typography.h2,
    color: Colors.semantic.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    justifyContent: 'flex-end',
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    ...Shadows.small,
  },
});