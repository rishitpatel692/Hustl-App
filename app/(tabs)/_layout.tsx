import React from 'react';
import { Tabs } from 'expo-router';
import { usePathname } from 'expo-router';
import { Chrome as Home, List, MessageCircle, Gift, Zap } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
      <View style={styles.fabShadow}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.8}
          accessibilityLabel="Post a task"
          accessibilityHint="Opens the create task screen"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#FF5A1F', '#FA4616']}
            style={styles.fabGradient}
          >
            <Zap size={24} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
            backgroundColor: 'transparent',
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
            borderTopWidth: 1,
            height: 80 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={['#0047FF', '#0021A5']}
              style={{ flex: 1 }}
            />
          },
          tabBarActiveTintColor: '#FA4616', // UF Orange for active
          tabBarInactiveTintColor: '#A0A7B3', // Light gray for inactive
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
  fabShadow: {
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    borderRadius: 28,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});