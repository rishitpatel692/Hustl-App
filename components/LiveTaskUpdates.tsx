import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import NotificationsOverlay from './NotificationsOverlay';

interface TaskUpdate {
  id: string;
  type: 'status_change' | 'new_message' | 'task_accepted' | 'task_completed';
  taskId: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function LiveTaskUpdates() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | undefined>();
  
  const buttonRef = useRef<TouchableOpacity>(null);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    if (!isGuest && user) {
      loadRecentUpdates();
      // In a real app, you'd set up real-time subscriptions here
      const interval = setInterval(loadRecentUpdates, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, isGuest]);

  useEffect(() => {
    if (updates.filter(u => !u.read).length > 0) {
      // Animate notification badge
      badgeScale.value = withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 15 })
      );
    }
  }, [updates]);

  const loadRecentUpdates = async () => {
    if (!user) return;

    try {
      // Load user's doing tasks to check for updates
      const { data: doingTasks } = await TaskRepo.listUserDoingTasks(user.id);
      const { data: postedTasks } = await TaskRepo.listUserPostedTasks(user.id);
      
      const mockUpdates: TaskUpdate[] = [];
      
      // Generate mock updates for demo
      if (doingTasks && doingTasks.length > 0) {
        doingTasks.forEach(task => {
          if (task.current_status && task.current_status !== 'accepted') {
            mockUpdates.push({
              id: `${task.id}-status`,
              type: 'status_change',
              taskId: task.id,
              title: task.title,
              message: `Status updated to ${TaskRepo.formatCurrentStatus(task.current_status)}`,
              timestamp: new Date(task.last_status_update || task.updated_at),
              read: false,
            });
          }
        });
      }

      if (postedTasks && postedTasks.length > 0) {
        postedTasks.forEach(task => {
          if (task.status === 'accepted' && task.accepted_by) {
            mockUpdates.push({
              id: `${task.id}-accepted`,
              type: 'task_accepted',
              taskId: task.id,
              title: task.title,
              message: 'Your task has been accepted!',
              timestamp: new Date(task.updated_at),
              read: false,
            });
          }
        });
      }

      setUpdates(mockUpdates.slice(0, 5)); // Show latest 5 updates
    } catch (error) {
      console.warn('Failed to load task updates:', error);
    }
  };

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const openNotifications = () => {
    triggerHaptics();
    
    // Measure button position for overlay placement
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorPosition({ x, y, width, height });
      setShowNotifications(true);
    });
  };

  const closeNotifications = () => {
    setShowNotifications(false);
  };

  const handleUpdatePress = (update: TaskUpdate) => {
    // Mark as read
    setUpdates(prev => prev.map(u => 
      u.id === update.id ? { ...u, read: true } : u
    ));
    
    // Navigate to task
    router.push(`/task/${update.taskId}`);
  };

  const markAllAsRead = () => {
    setUpdates(prev => prev.map(u => ({ ...u, read: true })));
  };

  const unreadCount = updates.filter(u => !u.read).length;

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (isGuest || !user) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        style={styles.notificationButton}
        onPress={openNotifications}
        accessibilityLabel="Open notifications"
        accessibilityRole="button"
      >
        <Bell size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
        {unreadCount > 0 && (
          <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      <NotificationsOverlay
        visible={showNotifications}
        onClose={closeNotifications}
        updates={updates}
        onUpdatePress={handleUpdatePress}
        onMarkAllRead={markAllAsRead}
        anchorPosition={anchorPosition}
      />
    </>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.mutedDark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
});