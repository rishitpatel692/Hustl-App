import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Camera, ChevronRight, FileText, History, MessageSquare, Settings, CircleHelp as HelpCircle, LogOut, ArrowLeft, Star } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { 
    icon: <User size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
    title: 'Profile Information',
    route: '/profile/edit'
  },
  { 
    icon: <FileText size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
    title: 'My Tasks',
    route: '/profile/my-tasks'
  },
  { 
    icon: <History size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
    title: 'Task History',
    route: '/profile/task-history'
  },
  { 
    icon: <MessageSquare size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
    title: 'Messages',
    route: '/(tabs)/chats'
  },
  { 
    icon: <Settings size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
    title: 'Settings',
    route: '/profile/settings'
  },
  { 
    icon: <HelpCircle size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
    title: 'Help & Support',
    route: '/profile/help'
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  // Create menu items with user context
  const getMenuItems = () => [
    { 
      icon: <User size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
      title: 'Profile Information',
      route: '/profile/edit'
    },
    { 
      icon: <Star size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
      title: 'Reviews',
      route: `/profile/reviews?userId=${user?.id || ''}`
    },
    { 
      icon: <FileText size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
      title: 'My Tasks',
      route: '/profile/my-tasks'
    },
    { 
      icon: <History size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
      title: 'Task History',
      route: '/profile/task-history'
    },
    { 
      icon: <MessageSquare size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
      title: 'Messages',
      route: '/(tabs)/chats'
    },
    { 
      icon: <Settings size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
      title: 'Settings',
      route: '/profile/settings'
    },
    { 
      icon: <HelpCircle size={20} color={Colors.semantic.bodyText} strokeWidth={2} />, 
      title: 'Help & Support',
      route: '/profile/help'
    },
  ];

  const handleMenuPress = (route: string) => {
    router.push(route as any);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(onboarding)/splash');
  };

  const handleBack = () => {
    router.back();
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMenuItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItem}
      onPress={() => handleMenuPress(item.route)}
    >
      <View style={styles.menuItemLeft}>
        {item.icon}
        <Text style={styles.menuItemText}>{item.title}</Text>
      </View>
      <ChevronRight size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user ? getInitials(user.displayName) : 'U'}
            </Text>
          </View>
          <TouchableOpacity style={styles.cameraButton}>
            <Camera size={16} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.displayName}>
          {user ? user.displayName : 'Guest User'}
        </Text>
        <Text style={styles.userInfo}>
          {user ? `${user.university || 'University of Florida'} • Student` : 'Student'}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuSection}>
          {getMenuItems().slice(0, 4).map(renderMenuItem)}
        </View>

        <View style={styles.menuSection}>
          {getMenuItems().slice(4).map((item, index) => renderMenuItem(item, index + 4))}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color={Colors.secondary} strokeWidth={2} />
              <Text style={[styles.menuItemText, { color: Colors.secondary }]}>Logout</Text>
            </View>
            <ChevronRight size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '33', // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  profileHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white + '33', // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 14,
    color: Colors.white + 'CC', // 80% opacity
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  menuSection: {
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    fontWeight: '500',
  },
});