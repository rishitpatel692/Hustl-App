import React from 'react';
import { Tabs } from 'expo-router';
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
          colors={['#0021A5', '#FA4616']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.postTaskGradient}
        >
          <Zap size={24} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
        </LinearGradient>
      </View>
      <Text style={[
        styles.postTaskLabel,
        { color: focused ? '#0021A5' : '#9CA3AF' }
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
            borderTopColor: 'rgba(229, 231, 235, 0.3)',
            borderTopWidth: 1,
            height: 88 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 12,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
          },
          tabBarActiveTintColor: '#0021A5', // UF Blue for active
          tabBarInactiveTintColor: '#9CA3AF', // Lighter gray for inactive
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 8,
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
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingBottom: 12,
  },
  postTaskButton: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    height: '100%',
  },
  postTaskIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
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
    textAlign: 'center',
  },
});