import React from 'react';
import { Tabs } from 'expo-router';
import { usePathname } from 'expo-router';
import { Chrome as Home, List, MessageCircle, Gift, Zap } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Lightning FAB Component
const LightningFAB = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Hide FAB on create screens
  const isCreateScreen = pathname === '/(tabs)/post';
  if (isCreateScreen) {
    return null;
  }

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push('/(tabs)/post');
  };

  const handleLongPress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    // Optional: show tooltip
  };

  return (
    <View style={[styles.fabContainer, { bottom: insets.bottom + 25 }]}>
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        accessibilityLabel="Post a task"
        accessibilityHint="Opens the create task screen"
        accessibilityRole="button"
      >
        <Zap size={24} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.semantic.screen,
            borderTopColor: Colors.semantic.divider,
            borderTopWidth: 1,
            height: 80 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarActiveTintColor: '#3B82F6', // Lighter glowing blue
          tabBarInactiveTintColor: '#9CA3AF', // Neutral gray
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color }) => (
              <Home size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ size, color, focused }) => (
              <List 
                size={size} 
                color={color} 
                strokeWidth={focused ? 2.5 : 2}
                fill={focused ? color : 'none'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            title: '',
            tabBarButton: () => null, // Hide the tab button, FAB replaces it
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            tabBarIcon: ({ size, color }) => (
              <MessageCircle size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="referrals"
          options={{
            title: 'Referrals',
            tabBarIcon: ({ size, color }) => (
              <Gift size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
      </Tabs>
      
      {/* Lightning FAB */}
      <LightningFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -28, // Half of FAB width (56/2)
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary, // UF Orange
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});