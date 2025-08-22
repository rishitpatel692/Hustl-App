import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, User, GraduationCap, MapPin } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
}

export default function ProfileSheet({ visible, onClose, profile }: ProfileSheetProps) {
  const insets = useSafeAreaInsets();

  const getInitials = (name: string | null): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!profile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {getInitials(profile.full_name || profile.username)}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.displayName}>
                {profile.full_name || profile.username || 'User'}
              </Text>
              
              {profile.username && profile.full_name && (
                <Text style={styles.username}>@{profile.username}</Text>
              )}
            </View>

            <View style={styles.infoSection}>
              {profile.major && (
                <View style={styles.infoItem}>
                  <GraduationCap size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                  <Text style={styles.infoText}>{profile.major}</Text>
                </View>
              )}
              
              {profile.university && (
                <View style={styles.infoItem}>
                  <MapPin size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                  <Text style={styles.infoText}>{profile.university}</Text>
                </View>
              )}
            </View>

            {profile.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.bioTitle}>About</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.semantic.screen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
    position: 'relative',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.semantic.tabInactive + '40',
    borderRadius: 2,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  infoSection: {
    gap: 16,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    flex: 1,
  },
  bioSection: {
    marginBottom: 24,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    lineHeight: 24,
  },
});