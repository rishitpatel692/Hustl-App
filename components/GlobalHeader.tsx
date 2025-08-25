import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
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
  const { user } = useAuth();

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
    
    if (!user) {
      router.push('/(onboarding)/auth');
      return;
    }
    
    // Open sidebar for authenticated users
    setShowProfileSidebar(true);
  };

  const handleProfileLongPress = () => {
    if (!user) return;
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

  if (!user) {
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
              source={require('@/assets/images/image.png')}
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
              source={require('@/assets/images/image.png')}
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 64,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  profileChip: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    padding: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  guestProfileChip: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.semantic.tabInactive + '40',
    padding: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.semantic.tabInactive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  guestAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  logo: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    flex: 1,
    letterSpacing: -0.3,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
    flex: 1,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.mutedDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});