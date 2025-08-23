import React from 'react';
import { Tabs } from 'expo-router';
import { usePathname } from 'expo-router';
import { Chrome as Home, List, MessageCircle, Gift, Zap } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Post Task Tab Button Component
const PostTaskButton = ({ focused }: { focused: boolean }) => {
  const router = useRouter();

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

  return (
    <TouchableOpacity
      style={styles.postTaskButton}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel="Post Task"
      accessibilityRole="button"
    >
      <View style={styles.postTaskIconContainer}>
        <LinearGradient
          colors={['#FF5A1F', '#FA4616']}
          style={styles.postTaskGradient}
        >
          <Zap size={24} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
        </LinearGradient>
      </View>
      <Text style={[
        styles.postTaskLabel,
        { color: focused ? '#FA4616' : '#6B7280' }
      ]}>
        Post Task
      </Text>
    </TouchableOpacity>
  );
};

// Custom tab bar button for Post Task
const PostTaskTabButton = (props: any) => {
  return (
    <View style={styles.postTaskTabContainer}>
      <PostTaskButton focused={props.accessibilityState?.selected || false} />
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
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E7EB',
            borderTopWidth: 1,
            height: 80 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          tabBarActiveTintColor: '#FA4616', // UF Orange for active
          tabBarInactiveTintColor: '#6B7280', // Gray for inactive
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
            title: 'Post Task',
            tabBarButton: PostTaskTabButton,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postTaskTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  postTaskButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  postTaskIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  postTaskGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTaskLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});