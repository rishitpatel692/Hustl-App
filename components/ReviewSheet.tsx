import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { ReviewRepo } from '@/lib/reviewRepo';
import { Task } from '@/types/database';

interface ReviewSheetProps {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
  onReviewSubmitted?: () => void;
}

const QUICK_TAGS = [
  'On time',
  'Friendly',
  'Great communication',
  'Professional',
  'Careful handling',
  'Quick delivery'
];

export default function ReviewSheet({ visible, onClose, task, onReviewSubmitted }: ReviewSheetProps) {
  const insets = useSafeAreaInsets();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when sheet opens
  useEffect(() => {
    if (visible) {
      setStars(5);
      setComment('');
      setSelectedTags([]);
      setError('');
    }
  }, [visible]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleStarPress = (rating: number) => {
    triggerHaptics();
    setStars(rating);
  };

  const handleTagToggle = (tag: string) => {
    triggerHaptics();
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!task || isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const { data, error: submitError } = await ReviewRepo.createReview({
        taskId: task.id,
        stars,
        comment: comment.trim(),
        tags: selectedTags
      });

      if (submitError) {
        setError(submitError);
        return;
      }

      // Success
      onReviewSubmitted?.();
      onClose();
    } catch (error) {
      setError('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = stars >= 1 && stars <= 5;

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Leave a Review</Text>
              <Text style={styles.subtitle}>
                How was your experience with this task?
              </Text>
              <Text style={styles.taskTitle}>"{task.title}"</Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Star Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rating *</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={styles.starButton}
                    onPress={() => handleStarPress(rating)}
                    disabled={isSubmitting}
                    accessibilityLabel={`${rating} star${rating !== 1 ? 's' : ''}`}
                    accessibilityRole="button"
                  >
                    <Star
                      size={32}
                      color={rating <= stars ? '#FFD700' : Colors.semantic.tabInactive}
                      fill={rating <= stars ? '#FFD700' : 'none'}
                      strokeWidth={1.5}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {stars === 1 ? '1 star' : `${stars} stars`}
              </Text>
            </View>

            {/* Quick Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Tags</Text>
              <View style={styles.tagsContainer}>
                {QUICK_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagButton,
                      selectedTags.includes(tag) && styles.tagButtonSelected
                    ]}
                    onPress={() => handleTagToggle(tag)}
                    disabled={isSubmitting}
                    accessibilityLabel={`${tag} tag`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedTags.includes(tag) }}
                  >
                    <Text style={[
                      styles.tagText,
                      selectedTags.includes(tag) && styles.tagTextSelected
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comment (Optional)</Text>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Share more details about your experience..."
                placeholderTextColor={Colors.semantic.tabInactive}
                multiline
                numberOfLines={4}
                maxLength={200}
                textAlignVertical="top"
                editable={!isSubmitting}
                returnKeyType="done"
                autoCapitalize="sentences"
                autoCorrect={true}
              />
              <Text style={styles.characterCount}>
                {comment.length}/200 characters
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              accessibilityLabel="Submit review"
              accessibilityRole="button"
            >
              <Text style={[
                styles.submitButtonText,
                (!isFormValid || isSubmitting) && styles.submitButtonTextDisabled
              ]}>
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
    position: 'relative',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.semantic.tabInactive + '40',
    borderRadius: 3,
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mutedDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 36,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontWeight: '500',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  errorContainer: {
    backgroundColor: '#FEF1F2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  errorText: {
    fontSize: 15,
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  starButton: {
    padding: 6,
  },
  ratingLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tagButton: {
    backgroundColor: Colors.mutedDark,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tagButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    letterSpacing: 0.2,
  },
  tagTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  commentInput: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: Colors.semantic.inputText,
    backgroundColor: Colors.semantic.inputBackground,
    minHeight: 100,
    marginBottom: 12,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  characterCount: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    textAlign: 'right',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.semantic.primaryButton,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.semantic.tabInactive,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  submitButtonTextDisabled: {
    color: Colors.semantic.tabInactive,
  },
});