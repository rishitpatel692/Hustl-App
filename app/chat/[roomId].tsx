import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Colors } from '@constants/Colors';
import { useAuth } from '@contexts/AuthContext';
import { ChatService } from '@lib/chat';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@src/types/chat';
import UserProfileSheet from '@/components/UserProfileSheet';

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
  const [showUserProfileSheet, setShowUserProfileSheet] = useState(false);
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
    setShowUserProfileSheet(true);
  }, []);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' +
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {formatTime(message.created_at)}
            </Text>
            {isOwnMessage && seen && (
              <Text style={styles.seenText}>Seen</Text>
            )}
          </View>
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
          <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerCenter} onPress={handleProfilePress}>
          <View style={styles.headerAvatar}>
            {otherUserProfile?.avatar_url ? (
              <Image source={{ uri: otherUserProfile.avatar_url }} style={styles.headerAvatarImage} />
            ) : (
              <Text style={styles.headerAvatarText}>
                {getInitials(otherUserProfile?.full_name || otherUserProfile?.username)}
              </Text>
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
        
        <View style={styles.headerRight} />
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
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        ) : (
          messages.map(renderMessage)
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.semantic.tabInactive}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isSending}
        >
          <Send size={20} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* User Profile Sheet */}
      <UserProfileSheet
        visible={showUserProfileSheet}
        onClose={() => setShowUserProfileSheet(false)}
        userId={otherUserId}
        currentChatRoomId={roomId}
      />
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginRight: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white + '33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.white + 'CC',
  },
  headerRight: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ownMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.muted,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.semantic.bodyText,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  ownMessageTime: {
    color: Colors.white,
  },
  otherMessageTime: {
    color: Colors.semantic.tabInactive,
  },
  seenText: {
    fontSize: 11,
    color: Colors.white,
    opacity: 0.8,
    fontWeight: '500',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: Colors.semantic.screen,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.divider,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.semantic.inputText,
    backgroundColor: Colors.semantic.inputBackground,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.semantic.tabInactive,
  },
});