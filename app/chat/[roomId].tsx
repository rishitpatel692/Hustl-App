import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MoveHorizontal as MoreHorizontal, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { Shadows, Typography, Spacing, BorderRadius } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { ChatService } from '@/lib/chat';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types/chat';
import UserProfileSheet from '@/components/UserProfileSheet';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const roomId = params.roomId as string;
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [otherLastReadAt, setOtherLastReadAt] = useState<Date | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const readChannelRef = useRef<any>(null);

  // Load message history
  useEffect(() => {
    loadMessages();
    loadOtherUserInfo();
  }, [roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;

    // Subscribe to new messages
    unsubscribeRef.current = ChatService.subscribeToRoom(roomId, (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    // Subscribe to read receipts via chat_members updates
    if (otherUserId) {
      readChannelRef.current = supabase
        .channel(`room_${roomId}_reads`)
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'chat_members', filter: `room_id=eq.${roomId}` },
            (payload) => {
              const row = payload.new as { user_id: string; last_read_at: string };
              if (row.user_id === otherUserId && row.last_read_at) {
                setOtherLastReadAt(new Date(row.last_read_at));
              }
            })
        .subscribe();
    }

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      readChannelRef.current?.unsubscribe();
      readChannelRef.current = null;
    };
  }, [roomId, otherUserId]);

  // Mark room as read when screen is focused
  useEffect(() => {
    if (roomId) {
      ChatService.markRoomRead(roomId);
    }
  }, [roomId]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await ChatService.getMessages(roomId);
      
      if (data) {
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      } else if (error) {
        console.error('Failed to load messages:', error);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOtherUserInfo = async () => {
    try {
      // Get room info to find the other user
      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          chat_members!inner(user_id)
        `)
        .eq('id', roomId)
        .single();

      if (roomData?.chat_members) {
        const otherMember = roomData.chat_members.find((m: any) => m.user_id !== user?.id);
        if (otherMember) {
          setOtherUserId(otherMember.user_id);
          
          // Load other user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, username, major, avatar_url, university')
            .eq('id', otherMember.user_id)
            .maybeSingle();
          
          setOtherUserProfile(profile);

          // Load their current last_read_at
          const { data: memberData } = await supabase
            .from('chat_members')
            .select('last_read_at')
            .eq('room_id', roomId)
            .eq('user_id', otherMember.user_id)
            .maybeSingle();

          if (memberData?.last_read_at) {
            setOtherLastReadAt(new Date(memberData.last_read_at));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load other user info:', error);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      if (!user) {
        setInputText(messageText);
        return;
      }

      const { error } = await ChatService.sendMessage(roomId, user.id, messageText);
      
      if (error) {
        console.error('Failed to send message:', error);
        setInputText(messageText);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleProfilePress = useCallback(() => {
    if (!otherUserId) return;
    
    // Analytics
    console.log('chat_profile_opened', { otherUserId, roomId });
    
    if (!otherUserId) return;
    
    // Analytics
    console.log('chat_profile_opened', { otherUserId, roomId });
    
    setShowProfile(true);
  }, [otherUserId, roomId]);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === date.toDateString();
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const isMessageSeen = (message: ChatMessage): boolean => {
    if (message.sender_id !== user?.id) return false;
    if (!otherLastReadAt) return false;
    
    const messageTime = new Date(message.created_at);
    return messageTime <= otherLastReadAt;
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

  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.sender_id === user?.id;
    const seen = isMessageSeen(message);
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
        </View>
        <View style={[
          styles.messageFooter,
          isOwnMessage ? styles.ownMessageFooter : styles.otherMessageFooter
        ]}>
          <Text style={styles.messageTime}>
            {formatTime(message.created_at)}
          </Text>
          {isOwnMessage && seen && (
            <Text style={styles.seenText}>Seen</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerCenter} onPress={handleProfilePress}>
          <View style={styles.headerAvatarContainer}>
            {otherUserProfile?.avatar_url ? (
              <Image source={{ uri: otherUserProfile.avatar_url }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>
                  {getInitials(otherUserProfile?.full_name || otherUserProfile?.username)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {otherUserProfile?.full_name || otherUserProfile?.username || 'User'}
            </Text>
            {otherUserProfile?.major && (
              <Text style={styles.headerSubtitle}>{otherUserProfile.major}</Text>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionsButton}>
          <MoreHorizontal size={20} color={Colors.semantic.bodyText} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
            </View>
            <Text style={styles.emptyText}>Start the conversation</Text>
            <Text style={styles.emptySubtext}>Send a message to get things started!</Text>
          </View>
        ) : (
          messages.map(renderMessage)
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton}>
            <Plus size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={Colors.semantic.tabInactive}
            multiline
            maxLength={1000}
          />
        </View>
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isSending}
        >
          {(!inputText.trim() || isSending) ? (
            <Send size={18} color={Colors.white} strokeWidth={2} />
          ) : (
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendButtonGradient}
            >
              <Send size={18} color={Colors.white} strokeWidth={2} />
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* User Profile Sheet */}
      <UserProfileSheet
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        userId={otherUserId}
        currentChatRoomId={roomId}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.borderLight,
    ...Shadows.small,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    marginRight: Spacing.lg,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.semantic.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    ...Typography.labelLarge,
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.semantic.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
  },
  optionsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  messagesContent: {
    padding: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxxl,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: Spacing.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    ...Typography.h2,
    color: Colors.semantic.textPrimary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textSecondary,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: Spacing.lg,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadows.small,
  },
  ownMessageBubble: {
    backgroundColor: Colors.semantic.primary,
    borderBottomRightRadius: BorderRadius.xs,
  },
  otherMessageBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  messageText: {
    ...Typography.bodyMedium,
  },
  ownMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.semantic.textPrimary,
  },
  messageFooter: {
    marginTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  ownMessageFooter: {
    alignItems: 'flex-end',
  },
  otherMessageFooter: {
    alignItems: 'flex-start',
  },
  messageTime: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
  },
  seenText: {
    ...Typography.labelSmall,
    color: Colors.semantic.textTertiary,
    marginTop: Spacing.xs,
  },
  inputContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.borderLight,
    ...Shadows.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    ...Shadows.small,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.bodyMedium,
    color: Colors.semantic.textPrimary,
    backgroundColor: 'transparent',
    maxHeight: 100,
    minHeight: 36,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});