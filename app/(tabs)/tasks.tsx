import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Platform, Alert, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, MapPin, Store, MessageCircle, Map as MapIcon, List as ListIcon, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Colors, ColorUtils } from '@/theme/colors';
import { Shadows, Typography, Spacing, BorderRadius } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { ChatService } from '@/lib/chat';
import { openGoogleMapsNavigation } from '@/lib/navigation';
import { ReviewRepo } from '@/lib/reviewRepo';
import { Task, TaskCurrentStatus } from '@/types/database';
import GlobalHeader from '@/components/GlobalHeader';
import Toast from '@/components/Toast';
import TasksMap, { TaskPin } from '@/components/TasksMap';
import ReviewSheet from '@/components/ReviewSheet';

type TabType = 'available' | 'doing' | 'posts';
type ViewMode = 'map' | 'list';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [activeTab, setActiveTab] = useState<TabType>('available');
  
  // Task data
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [doingTasks, setDoingTasks] = useState<Task[]>([]);
  const [postedTasks, setPostedTasks] = useState<Task[]>([]);
  
  // Location state
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  
  // Error states
  const [error, setError] = useState<string>('');
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Review state
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [taskToReview, setTaskToReview] = useState<Task | null>(null);

  // Request location permission on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      }
    } catch (error) {
      console.warn('Location permission error:', error);
      setLocationPermission('denied');
    }
  };

  // Load tasks based on active tab
  const loadTasks = useCallback(async (showRefreshIndicator = false) => {
    if (isGuest || !user) return;

    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError('');

    try {
      let result;
      
      switch (activeTab) {
        case 'available':
          result = await TaskRepo.listOpenTasks(user.id);
          if (result.data) setAvailableTasks(result.data);
          break;
        case 'doing':
          result = await TaskRepo.listUserDoingTasks(user.id);
          if (result.data) setDoingTasks(result.data);
          break;
        case 'posts':
          result = await TaskRepo.listUserPostedTasks(user.id);
          if (result.data) setPostedTasks(result.data);
          break;
      }

      if (result?.error) {
        if (result.error.includes('not found') || result.error.includes('no longer available')) {
          setToast({
            visible: true,
            message: result.error,
            type: 'error'
          });
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      setError('Failed to load tasks. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, user, isGuest]);

  // Load tasks when tab changes or component mounts
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    setViewMode(mode);
  };

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    setActiveTab(tab);
  };

  // Handle pull to refresh
  const handleRefresh = () => {
    loadTasks(true);
  };

  // Handle task acceptance
  const handleAcceptTask = async (task: Task) => {
    if (isGuest || !user) return;
    if (acceptingTaskId) return;

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }

    setAcceptingTaskId(task.id);
    setError('');

    try {
      const result = await TaskRepo.acceptTask(task.id, user.id);

      if (result.error) {
        setToast({
          visible: true,
          message: result.error,
          type: 'error'
        });
        return;
      }

      if (result.data) {
        setAvailableTasks(prev => prev.filter(t => t.id !== task.id));
        setDoingTasks(prev => [result.data!, ...prev]);
        
        setToast({
          visible: true,
          message: 'Task accepted! Chat is now available.',
          type: 'success'
        });

        // Open Google Maps navigation if location is available
        if (userLocation && task.dropoff_address) {
          try {
            // For demo, use UF campus coordinates for store location
            const storeLocation = { lat: 29.6436, lng: -82.3549 };
            const dropoffLocation = { lat: 29.6436 + (Math.random() - 0.5) * 0.02, lng: -82.3549 + (Math.random() - 0.5) * 0.02 };
            
            await openGoogleMapsNavigation({
              start: { lat: userLocation.coords.latitude, lng: userLocation.coords.longitude },
              dest: dropoffLocation,
              waypoint: storeLocation, // Pickup location
            });
          } catch (error) {
            console.warn('Failed to open navigation:', error);
          }
        }
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to accept task. Please try again.',
        type: 'error'
      });
    } finally {
      setAcceptingTaskId(null);
    }
  };

  // Handle chat button press
  const handleChatPress = async (task: Task) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }

    try {
      const { data: room, error } = await ChatService.getRoomForTask(task.id);
      
      if (error || !room) {
        const { data: newRoom, error: createError } = await ChatService.ensureRoomForTask(task.id);
        if (createError || !newRoom) {
          setToast({
            visible: true,
            message: 'Chat not available for this task',
            type: 'error'
          });
          return;
        }
        router.push(`/chat/${newRoom.id}`);
      } else {
        router.push(`/chat/${room.id}`);
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'Chat not available for this task',
        type: 'error'
      });
    }
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleReviewSubmitted = () => {
    setShowReviewSheet(false);
    setTaskToReview(null);
    setToast({
      visible: true,
      message: 'Review submitted successfully!',
      type: 'success'
    });
  };

  const addNewTaskToPosts = useCallback((newTask: Task) => {
    setPostedTasks(prev => [newTask, ...prev]);
  }, []);

  React.useEffect(() => {
    (global as any).addNewTaskToTasksList = addNewTaskToPosts;
    return () => {
      delete (global as any).addNewTaskToTasksList;
    };
  }, [addNewTaskToPosts]);

  const renderTaskCard = (task: Task) => {
    const isOwnTask = user && task.created_by === user.id;
    const isAccepting = acceptingTaskId === task.id;
    const canAccept = activeTab === 'available' && !isOwnTask && !isGuest && user;
    const canChat = task.status === 'accepted' && user && 
      (task.created_by === user.id || task.accepted_by === user.id);
    const canUpdateStatus = activeTab === 'doing' && user && task.accepted_by === user.id && task.status === 'accepted';
    const showStatusUpdate = canUpdateStatus && task.current_status && task.current_status !== 'completed';
    const canReview = activeTab === 'posts' && user && task.created_by === user.id && task.status === 'completed';

    return (
      <View key={task.id} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {TaskRepo.formatCategory(task.category)}
              </Text>
            </View>
          </View>
          <Text style={styles.taskReward}>
            {TaskRepo.formatReward(task.reward_cents)}
          </Text>
        </View>
        
        {task.description ? (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
        
        {/* Current Status Display */}
        {task.current_status && task.current_status !== 'accepted' && (
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: TaskRepo.getCurrentStatusColor(task.current_status) + '20' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: TaskRepo.getCurrentStatusColor(task.current_status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: TaskRepo.getCurrentStatusColor(task.current_status) }
              ]}>
                {TaskRepo.formatCurrentStatus(task.current_status)}
              </Text>
            </View>
            {task.last_status_update && (
              <Text style={styles.lastUpdated}>
                Updated {new Date(task.last_status_update).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            )}
          </View>
        )}

        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <Store size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText}>{task.store}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MapPin size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText} numberOfLines={1}>
              {task.dropoff_address}
            </Text>
          </View>
        </View>
        
        <View style={styles.taskMeta}>
          <View style={styles.metaLeft}>
            <View style={styles.metaItem}>
              <Clock size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.metaText}>
                {TaskRepo.formatEstimatedTime(task.estimated_minutes)}
              </Text>
            </View>
            
            <View style={styles.urgencyContainer}>
              <View style={[
                styles.urgencyDot, 
                { backgroundColor: TaskRepo.getUrgencyColor(task.urgency) }
              ]} />
              <Text style={styles.metaText}>
                {TaskRepo.formatUrgency(task.urgency)}
              </Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            {canAccept && (
              <TouchableOpacity 
                style={[
                  styles.acceptButton,
                  isAccepting && styles.acceptButtonLoading
                ]}
                onPress={() => handleAcceptTask(task)}
                disabled={isAccepting}
              >
                <Text style={styles.acceptButtonText}>
                  {isAccepting ? 'Accepting...' : 'Accept Task'}
                </Text>
              </TouchableOpacity>
            )}
            
            {showStatusUpdate && (
              <TouchableOpacity 
                style={styles.statusButton}
                onPress={() => router.push(`/task/${task.id}`)}
              >
                <Text style={styles.statusButtonText}>Update Status</Text>
                <ChevronRight size={14} color={Colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            )}

            {canChat && (
              <TouchableOpacity 
                style={styles.chatButton}
                onPress={() => handleChatPress(task)}
              >
                <MessageCircle size={16} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            )}

            {canReview && (
              <TouchableOpacity 
                style={styles.reviewButton}
                onPress={() => {
                  setTaskToReview(task);
                  setShowReviewSheet(true);
                }}
              >
                <Text style={styles.reviewButtonText}>Review</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isOwnTask && activeTab === 'available' && (
            <View style={styles.ownTaskIndicator}>
              <Text style={styles.ownTaskText}>Your task</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMapView = () => {
    const currentTasks = getCurrentTasks();
    
    // Convert tasks to map pins with demo coordinates around UF campus
    const pins: TaskPin[] = currentTasks.map((task) => {
      // For demo, place tasks around UF campus with slight offsets
      const latitude = 29.6436 + (Math.random() - 0.5) * 0.02;
      const longitude = -82.3549 + (Math.random() - 0.5) * 0.02;
      
      return {
        id: task.id,
        title: task.title,
        reward: TaskRepo.formatReward(task.reward_cents),
        store: task.store,
        urgency: task.urgency,
        latitude,
        longitude,
      };
    });
    
    return (
      <TasksMap
        pins={pins}
        onPressPin={(taskId) => console.log('Task details:', taskId)}
        showsUserLocation={locationPermission === 'granted'}
        locationPermission={locationPermission}
        onRequestLocation={requestLocationPermission}
      />
    );
  };

  const renderListView = () => {
    const currentTasks = getCurrentTasks();

    return (
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Tab Selector for List View */}
        <View style={[styles.segmentedControl, { marginTop: 12, marginBottom: 24 }]}>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'available' && styles.activeSegment]}
            onPress={() => handleTabChange('available')}
          >
            <Text style={[styles.segmentText, activeTab === 'available' && styles.activeSegmentText]}>
              Available
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.segment, activeTab === 'doing' && styles.activeSegment]}
            onPress={() => handleTabChange('doing')}
          >
            <Text style={[styles.segmentText, activeTab === 'doing' && styles.activeSegmentText]}>
              You're Doing
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.segment, activeTab === 'posts' && styles.activeSegment]}
            onPress={() => handleTabChange('posts')}
          >
            <Text style={[styles.segmentText, activeTab === 'posts' && styles.activeSegmentText]}>
              Your Posts
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && !isRefreshing ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : currentTasks.length > 0 ? (
          <View style={styles.tasksList}>
            {currentTasks.map(renderTaskCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    );
  };

  const renderEmptyState = () => {
    let title = 'No tasks available';
    let subtitle = 'Check back later for new opportunities';

    if (activeTab === 'doing') {
      title = 'No tasks in progress';
      subtitle = 'Accept a task from Available to get started';
    } else if (activeTab === 'posts') {
      title = 'No posted tasks';
      subtitle = 'Create your first task to get help from other students';
    }

    return (
      <View style={styles.emptyState}>
        <Image
          source={require('@/assets/images/image.png')}
          style={styles.emptyStateLogo}
          resizeMode="contain"
        />
        <Text style={styles.emptyStateText}>{title}</Text>
        <Text style={styles.emptyStateSubtext}>{subtitle}</Text>
      </View>
    );
  };

  const getCurrentTasks = () => {
    switch (activeTab) {
      case 'available':
        return availableTasks;
      case 'doing':
        return doingTasks;
      case 'posts':
        return postedTasks;
      default:
        return [];
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <GlobalHeader title="Tasks" showSearch={false} />

        {/* View Mode Toggle */}
        <View style={[styles.viewModeToggle, { marginTop: 8 }]}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'map' && styles.activeViewMode]}
            onPress={() => handleViewModeChange('map')}
          >
            <MapIcon size={20} color={viewMode === 'map' ? Colors.white : Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={[styles.viewModeText, viewMode === 'map' && styles.activeViewModeText]}>
              Map
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
            onPress={() => handleViewModeChange('list')}
          >
            <ListIcon size={20} color={viewMode === 'list' ? Colors.white : Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={[styles.viewModeText, viewMode === 'list' && styles.activeViewModeText]}>
              List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={[styles.errorBanner, { marginHorizontal: 16 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Content based on view mode */}
        {viewMode === 'map' ? renderMapView() : renderListView()}
      </SafeAreaView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Review Sheet */}
      <ReviewSheet
        visible={showReviewSheet}
        onClose={() => {
          setShowReviewSheet(false);
          setTaskToReview(null);
        }}
        task={taskToReview}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  viewModeToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    ...Shadows.small,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  activeViewMode: {
    backgroundColor: Colors.semantic.primary,
    ...Shadows.small,
  },
  viewModeText: {
    ...Typography.labelMedium,
    color: Colors.semantic.textTertiary,
  },
  activeViewModeText: {
    color: Colors.white,
  },
  mapContainer: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    ...Shadows.small,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  activeSegment: {
    backgroundColor: Colors.white,
    ...Shadows.small,
  },
  segmentText: {
    ...Typography.labelMedium,
    color: Colors.semantic.textTertiary,
  },
  activeSegmentText: {
    color: Colors.semantic.primary,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: Colors.semantic.error + '10',
    borderWidth: 1,
    borderColor: Colors.semantic.error + '30',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.semantic.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingState: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textTertiary,
  },
  tasksList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },
  taskCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    ...Shadows.medium,
  },
  statusContainer: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.labelMedium,
  },
  lastUpdated: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
    fontStyle: 'italic',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  taskTitle: {
    ...Typography.h3,
    color: Colors.semantic.textPrimary,
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  categoryText: {
    ...Typography.labelSmall,
    color: Colors.semantic.textTertiary,
  },
  taskReward: {
    ...Typography.h2,
    color: Colors.semantic.secondary,
  },
  taskDescription: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textSecondary,
    marginBottom: Spacing.lg,
  },
  taskDetails: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailText: {
    flex: 1,
    ...Typography.bodyMedium,
    color: Colors.semantic.textPrimary,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.semantic.textTertiary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.semantic.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    gap: Spacing.xs,
  },
  statusButtonText: {
    ...Typography.labelMedium,
    color: Colors.semantic.primary,
  },
  acceptButton: {
    backgroundColor: Colors.semantic.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    ...Shadows.small,
  },
  acceptButtonLoading: {
    backgroundColor: Colors.gray400,
  },
  acceptButtonText: {
    ...Typography.labelMedium,
    color: Colors.white,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.semantic.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    gap: Spacing.sm,
  },
  chatButtonText: {
    ...Typography.labelMedium,
    color: Colors.semantic.primary,
  },
  reviewButton: {
    backgroundColor: Colors.semantic.success,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    ...Shadows.small,
  },
  reviewButtonText: {
    ...Typography.labelMedium,
    color: Colors.white,
  },
  ownTaskIndicator: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  ownTaskText: {
    ...Typography.labelSmall,
    color: Colors.semantic.textTertiary,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxxl,
    paddingVertical: 80,
    minHeight: 300,
    gap: Spacing.lg,
  },
  emptyStateLogo: {
    width: 64,
    height: 64,
    opacity: 0.3,
  },
  emptyStateText: {
    ...Typography.h3,
    color: Colors.semantic.textPrimary,
  },
  emptyStateSubtext: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxxxl,
  },
});