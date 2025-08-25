import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Bell, Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withSequence
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { Task } from '@/types/database';

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
  const scale = useSharedValue(1);
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

  const handleNotificationPress = () => {
    triggerHaptics();
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 15 })
    );
    setShowNotifications(!showNotifications);
  };

  const handleUpdatePress = (update: TaskUpdate) => {
    triggerHaptics();
    
    // Mark as read
    setUpdates(prev => prev.map(u => 
      u.id === update.id ? { ...u, read: true } : u
    ));
    
    // Navigate to task
    router.push(`/task/${update.taskId}`);
    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    setUpdates(prev => prev.map(u => ({ ...u, read: true })));
  };

  const getUpdateIcon = (type: TaskUpdate['type']) => {
    switch (type) {
      case 'status_change':
        return <Clock size={16} color={Colors.primary} strokeWidth={2} />;
      case 'task_accepted':
        return <CheckCircle size={16} color={Colors.semantic.successAlert} strokeWidth={2} />;
      case 'task_completed':
        return <CheckCircle size={16} color={Colors.semantic.successAlert} strokeWidth={2} />;
      case 'new_message':
        return <Bell size={16} color={Colors.secondary} strokeWidth={2} />;
      default:
        return <AlertCircle size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />;
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diffInMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  const unreadCount = updates.filter(u => !u.read).length;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (isGuest || !user || updates.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationPress}
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
      </Animated.View>

      {showNotifications && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Recent Updates</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead}>
                <Text style={styles.markAllReadText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.updatesList} showsVerticalScrollIndicator={false}>
            {updates.map((update) => (
              <TouchableOpacity
                key={update.id}
                style={[
                  styles.updateItem,
                  !update.read && styles.updateItemUnread
                ]}
                onPress={() => handleUpdatePress(update)}
              >
                <View style={styles.updateIcon}>
                  {getUpdateIcon(update.type)}
                </View>
                
                <View style={styles.updateContent}>
                  <Text style={styles.updateTitle} numberOfLines={1}>
                    {update.title}
                  </Text>
                  <Text style={styles.updateMessage} numberOfLines={2}>
                    {update.message}
                  </Text>
                  <Text style={styles.updateTime}>
                    {formatTimestamp(update.timestamp)}
                  </Text>
                </View>

                {!update.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  notificationButton: {
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
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    right: 0,
    width: 320,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 1000,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  markAllReadText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  updatesList: {
    maxHeight: 300,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
  },
  updateItemUnread: {
    backgroundColor: Colors.primary + '05',
  },
  updateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.mutedDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  updateContent: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
  },
  updateMessage: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    lineHeight: 20,
    marginBottom: 6,
  },
  updateTime: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginTop: 8,
  },
});