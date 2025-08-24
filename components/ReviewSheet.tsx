import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { Shadows, Typography, Spacing, BorderRadius } from '@/theme/colors';
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
    backgroundColor: Colors.semantic.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    position: 'relative',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    marginBottom: Spacing.xl,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxxl,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxxl,
    gap: Spacing.md,
  },
  title: {
    ...Typography.displayMedium,
    color: Colors.semantic.textPrimary,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.semantic.textSecondary,
    textAlign: 'center',
  },
  taskTitle: {
    ...Typography.labelLarge,
    color: Colors.semantic.primary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: Colors.semantic.error + '10',
    borderWidth: 1,
    borderColor: Colors.semantic.error + '30',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.semantic.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.xxxxl,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.semantic.textPrimary,
    marginBottom: Spacing.xl,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  starButton: {
    padding: Spacing.xs,
  },
  ratingLabel: {
    ...Typography.h3,
    color: Colors.semantic.textPrimary,
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  tagButton: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  tagButtonSelected: {
    backgroundColor: Colors.semantic.primary,
    borderColor: Colors.semantic.primary,
  },
  tagText: {
    ...Typography.labelMedium,
    color: Colors.semantic.textPrimary,
  },
  tagTextSelected: {
    color: Colors.white,
  },
  commentInput: {
    backgroundColor: Colors.semantic.surface,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    ...Typography.bodyMedium,
    color: Colors.semantic.textPrimary,
    height: 100,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  characterCount: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: Colors.semantic.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    ...Shadows.medium,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  submitButtonText: {
    ...Typography.labelLarge,
    color: Colors.white,
  },
  submitButtonTextDisabled: {
    color: Colors.gray500,
  },
});