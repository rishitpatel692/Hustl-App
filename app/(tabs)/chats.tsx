import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import { Colors } from '@constants/Colors';
import { useAuth } from '@contexts/AuthContext';
import { ChatService } from '@lib/chat';
import type { InboxItem } from '@src/types/chat';
import GlobalHeader from '@components/GlobalHeader';


export default function ChatsScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [inbox, setInbox] = React.useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadChatInbox();
  }, []);

  const loadChatInbox = async () => {
    if (isGuest || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await ChatService.getChatInbox();
      if (data) {
        setInbox(data);
      }
      if (error) {
        console.error('Failed to load chat inbox:', error);
      }
    } catch (error) {
      console.error('Failed to load chat inbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatPress = (roomId: string) => {
    router.push(`/chat/${roomId}`);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name: string | null): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderChatItem = (item: InboxItem) => (
    <TouchableOpacity 
      key={item.room_id} 
      style={styles.chatItem} 
      onPress={() => handleChatPress(item.room_id)}
    >
      <View style={styles.avatar}>
        {item.other_avatar_url ? (
          <Image source={{ uri: item.other_avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{getInitials(item.other_name)}</Text>
        )}
      </View>
      
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <View style={styles.chatNameContainer}>
            <Text style={styles.chatName}>{item.other_name || 'User'}</Text>
            {item.other_major && (
              <Text style={styles.chatMajor}>{item.other_major}</Text>
            )}
          </View>
          <View style={styles.rightSection}>
            {item.last_message_at && (
              <Text style={styles.timestamp}>{formatTimestamp(item.last_message_at)}</Text>
            )}
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require('../../src/assets/images/image.png')}
        style={styles.emptyStateLogo}
        resizeMode="contain"
      />
      <Text style={styles.emptyStateText}>No messages yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Start a conversation by accepting a task or posting one!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <GlobalHeader title="Messages" showSearch={false} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading chats...</Text>
          </View>
        ) : inbox.length > 0 ? (
          <View style={styles.chatsList}>
            {inbox.map(renderChatItem)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  content: {
    flex: 1,
  },
  chatsList: {
    paddingHorizontal: 24,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatNameContainer: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  chatMajor: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  unreadBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
    gap: 16,
  },
  emptyStateLogo: {
    width: 64,
    height: 64,
    opacity: 0.3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 20,
  },
});