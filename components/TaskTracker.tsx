import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Clock, Navigation, Phone, MessageCircle, CircleCheck as CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { Task, TaskCurrentStatus } from '@/types/database';
import { TaskRepo } from '@/lib/taskRepo';
import { openGoogleMapsNavigation } from '@/lib/navigation';

interface TaskTrackerProps {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
  onStatusUpdate?: (status: TaskCurrentStatus) => void;
}

const STATUS_STEPS: { status: TaskCurrentStatus; label: string; description: string }[] = [
  { status: 'accepted', label: 'Accepted', description: 'Task has been accepted' },
  { status: 'picked_up', label: 'Picked Up', description: 'Items collected from store' },
  { status: 'on_the_way', label: 'On the Way', description: 'Heading to delivery location' },
  { status: 'delivered', label: 'Delivered', description: 'Items delivered successfully' },
  { status: 'completed', label: 'Completed', description: 'Task completed' },
];

export default function TaskTracker({ visible, onClose, task, onStatusUpdate }: TaskTrackerProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (task?.current_status) {
      const stepIndex = STATUS_STEPS.findIndex(step => step.status === task.current_status);
      setCurrentStep(stepIndex >= 0 ? stepIndex : 0);
    }
  }, [task?.current_status]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleNavigateToStore = async () => {
    if (!task) return;
    
    triggerHaptics();
    
    try {
      // For demo, use UF campus coordinates for store location
      const storeLocation = { lat: 29.6436, lng: -82.3549 };
      const userLocation = { lat: 29.6436 + 0.01, lng: -82.3549 + 0.01 };
      
      await openGoogleMapsNavigation({
        start: userLocation,
        dest: storeLocation,
      });
    } catch (error) {
      console.warn('Failed to open navigation:', error);
    }
  };

  const handleNavigateToDropoff = async () => {
    if (!task) return;
    
    triggerHaptics();
    
    try {
      // For demo, use coordinates around UF campus
      const storeLocation = { lat: 29.6436, lng: -82.3549 };
      const dropoffLocation = { lat: 29.6436 + 0.005, lng: -82.3549 + 0.005 };
      
      await openGoogleMapsNavigation({
        start: storeLocation,
        dest: dropoffLocation,
      });
    } catch (error) {
      console.warn('Failed to open navigation:', error);
    }
  };

  const handleStatusUpdate = (newStatus: TaskCurrentStatus) => {
    triggerHaptics();
    onStatusUpdate?.(newStatus);
  };

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
            <View style={styles.headerContent}>
              <Text style={styles.title}>Task Progress</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Task Info */}
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskReward}>
                {TaskRepo.formatReward(task.reward_cents)}
              </Text>
            </View>

            {/* Progress Steps */}
            <View style={styles.progressContainer}>
              <Text style={styles.sectionTitle}>Progress</Text>
              <View style={styles.stepsContainer}>
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;
                  const isUpcoming = index > currentStep;

                  return (
                    <View key={step.status} style={styles.stepContainer}>
                      <View style={styles.stepLeft}>
                        <View style={[
                          styles.stepIndicator,
                          isCompleted && styles.stepCompleted,
                          isCurrent && styles.stepCurrent,
                          isUpcoming && styles.stepUpcoming,
                        ]}>
                          {isCompleted ? (
                            <CheckCircle size={16} color={Colors.white} strokeWidth={2} />
                          ) : (
                            <View style={[
                              styles.stepDot,
                              isCurrent && styles.stepDotCurrent,
                            ]} />
                          )}
                        </View>
                        {index < STATUS_STEPS.length - 1 && (
                          <View style={[
                            styles.stepLine,
                            isCompleted && styles.stepLineCompleted,
                          ]} />
                        )}
                      </View>
                      
                      <View style={styles.stepContent}>
                        <Text style={[
                          styles.stepLabel,
                          isCompleted && styles.stepLabelCompleted,
                          isCurrent && styles.stepLabelCurrent,
                        ]}>
                          {step.label}
                        </Text>
                        <Text style={styles.stepDescription}>
                          {step.description}
                        </Text>
                        
                        {isCurrent && index < STATUS_STEPS.length - 1 && (
                          <TouchableOpacity
                            style={styles.updateButton}
                            onPress={() => handleStatusUpdate(STATUS_STEPS[index + 1].status)}
                          >
                            <Text style={styles.updateButtonText}>
                              Mark as {STATUS_STEPS[index + 1].label}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Navigation Actions */}
            <View style={styles.actionsContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToStore}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.actionButtonGradient}
                >
                  <Navigation size={20} color={Colors.white} strokeWidth={2} />
                  <Text style={styles.actionButtonText}>Navigate to {task.store}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToDropoff}>
                <LinearGradient
                  colors={[Colors.secondary, Colors.secondaryDark]}
                  style={styles.actionButtonGradient}
                >
                  <MapPin size={20} color={Colors.white} strokeWidth={2} />
                  <Text style={styles.actionButtonText}>Navigate to Drop-off</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Task Details */}
            <View style={styles.detailsContainer}>
              <Text style={styles.sectionTitle}>Task Details</Text>
              
              <View style={styles.detailRow}>
                <MapPin size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Store</Text>
                  <Text style={styles.detailValue}>{task.store}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MapPin size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Drop-off Address</Text>
                  <Text style={styles.detailValue}>{task.dropoff_address}</Text>
                </View>
              </View>

              {task.dropoff_instructions && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Instructions:</Text>
                  <Text style={styles.detailValue}>{task.dropoff_instructions}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Clock size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Estimated Time</Text>
                  <Text style={styles.detailValue}>
                    {TaskRepo.formatEstimatedTime(task.estimated_minutes)}
                  </Text>
                </View>
              </View>
            </View>
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
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.semantic.tabInactive + '40',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mutedDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  taskInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
  },
  taskTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginRight: 16,
  },
  taskReward: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary,
  },
  progressContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 16,
  },
  stepsContainer: {
    gap: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    minHeight: 60,
  },
  stepLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.mutedDark,
    borderWidth: 2,
    borderColor: Colors.semantic.borderLight,
  },
  stepCompleted: {
    backgroundColor: Colors.semantic.successAlert,
    borderColor: Colors.semantic.successAlert,
  },
  stepCurrent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepUpcoming: {
    backgroundColor: Colors.mutedDark,
    borderColor: Colors.semantic.borderLight,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.semantic.tabInactive,
  },
  stepDotCurrent: {
    backgroundColor: Colors.white,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.semantic.borderLight,
    marginTop: 8,
  },
  stepLineCompleted: {
    backgroundColor: Colors.semantic.successAlert,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
    marginBottom: 4,
  },
  stepLabelCompleted: {
    color: Colors.semantic.successAlert,
  },
  stepLabelCurrent: {
    color: Colors.primary,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  actionsContainer: {
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  detailsContainer: {
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    fontWeight: '500',
  },
});