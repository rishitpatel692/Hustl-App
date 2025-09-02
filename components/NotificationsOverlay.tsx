import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Clock, CircleCheck as CheckCircle, Bell, MessageCircle, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Colors } from '@/theme/colors';
import Overlay from './Overlay';

interface TaskUpdate {
  id: string;
  type: 'status_change' | 'new_message' | 'task_accepted' | 'task_completed';
  taskId: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsOverlayProps {
  visible: boolean;
  onClose: () => void;
  updates: TaskUpdate[];
  onUpdatePress: (update: TaskUpdate) => void;
  onMarkAllRead: () => void;
  anchorPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function NotificationsOverlay({
  visible,
  onClose,
  updates,
  onUpdatePress,
  onMarkAllRead,
  anchorPosition
}: NotificationsOverlayProps) {
  const router = useRouter();

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
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
        return <MessageCircle size={16} color={Colors.secondary} strokeWidth={2} />;
      default:
        return <Bell size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />;
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

  const handleUpdatePress = (update: TaskUpdate) => {
    triggerHaptics();
    onUpdatePress(update);
    onClose();
  };

  const handleMarkAllRead = () => {
    triggerHaptics();
    onMarkAllRead();
  };

  const unreadCount = updates.filter(u => !u.read).length;

  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      anchorPosition={anchorPosition}
      placement="bottom"
      maxHeight={500}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Recent Updates</Text>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={styles.markAllReadText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Updates List */}
        <ScrollView 
          style={styles.updatesList} 
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {updates.length > 0 ? (
            updates.map((update) => (
              <TouchableOpacity
                key={update.id}
                style={[
                  styles.updateItem,
                  !update.read && styles.updateItemUnread
                ]}
                onPress={() => handleUpdatePress(update)}
                activeOpacity={0.7}
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
            ))
          ) : (
            <View style={styles.emptyState}>
              <Bell size={32} color={Colors.semantic.tabInactive} strokeWidth={1} />
              <Text style={styles.emptyStateText}>No updates yet</Text>
              <Text style={styles.emptyStateSubtext}>
                You'll see task updates and messages here
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 450,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllReadText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  updatesList: {
    maxHeight: 350,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
});