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
    
    // Open sidebar
    setShowProfileSidebar(true);
  };

  const handleProfileLongPress = () => {
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileChip: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    padding: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logo: {
    width: 28,
    height: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
});