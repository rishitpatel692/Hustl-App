import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Platform, Alert, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, MapPin, Store, MessageCircle, Map as MapIcon, List as ListIcon, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, ColorUtils } from '@/theme/colors';
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
import TaskTracker from '@/components/TaskTracker';

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
  
  // Task tracker state
  const [showTaskTracker, setShowTaskTracker] = useState(false);
  const [taskToTrack, setTaskToTrack] = useState<Task | null>(null);

  // Request location permission on mount
  useEffect(() => {
    // Location permission temporarily disabled for Expo Go stability
  }, []);

  const requestLocationPermission = async () => {
    // Location services temporarily disabled for Expo Go stability
    setLocationPermission('denied');
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
    // Haptics temporarily disabled for Expo Go stability
    setViewMode(mode);
  };

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    // Haptics temporarily disabled for Expo Go stability
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

    // Haptics temporarily disabled for Expo Go stability

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
    // Haptics temporarily disabled for Expo Go stability

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
                onPress={() => {
                  setTaskToTrack(task);
                  setShowTaskTracker(true);
                }}
              >
                <Text style={styles.statusButtonText}>Track Progress</Text>
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
    
    // Convert tasks to map pins with realistic coordinates around UF campus
    const pins: TaskPin[] = currentTasks.map((task) => {
      // Use more realistic coordinates based on task store
      const baseCoords = getStoreCoordinates(task.store);
      const latitude = baseCoords.latitude + (Math.random() - 0.5) * 0.005;
      const longitude = baseCoords.longitude + (Math.random() - 0.5) * 0.005;
      
      return {
        id: task.id,
        title: task.title,
        reward: TaskRepo.formatReward(task.reward_cents),
        store: task.store,
        urgency: task.urgency,
        latitude,
        longitude,
        storeCoordinates: baseCoords,
      };
    });
    
    return (
      <View style={styles.mapContainer}>
        <TasksMap
          pins={pins}
          onPressPin={(taskId) => router.push(`/task/${taskId}`)}
          showsUserLocation={locationPermission === 'granted'}
          locationPermission={locationPermission}
          onRequestLocation={requestLocationPermission}
        />
      </View>
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
        <View style={styles.tabSelectorContainer}>
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

  const getStoreCoordinates = (storeName: string): Coordinates => {
    // Map common store names to campus locations
    const storeMap: Record<string, Coordinates> = {
      'Starbucks': { latitude: 29.6516, longitude: -82.3442 },
      'Chipotle': { latitude: 29.6234, longitude: -82.3678 },
      'Chick-fil-A': { latitude: 29.6465, longitude: -82.3473 },
      'Publix': { latitude: 29.6234, longitude: -82.3678 },
      'Subway': { latitude: 29.6465, longitude: -82.3473 },
      'Dunkin': { latitude: 29.6516, longitude: -82.3442 },
    };

    // Find matching store or use default campus center
    for (const [key, coords] of Object.entries(storeMap)) {
      if (storeName.toLowerCase().includes(key.toLowerCase())) {
        return coords;
      }
    }

    // Default to campus center with slight variation
    return {
      latitude: 29.6436 + (Math.random() - 0.5) * 0.01,
      longitude: -82.3549 + (Math.random() - 0.5) * 0.01,
    };
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

      {/* Task Tracker */}
      <TaskTracker
        visible={showTaskTracker}
        onClose={() => {
          setShowTaskTracker(false);
          setTaskToTrack(null);
        }}
        task={taskToTrack}
        onStatusUpdate={(status) => {
          // Handle status update
          console.log('Status update:', status);
          setShowTaskTracker(false);
          setTaskToTrack(null);
          loadTasks(); // Refresh tasks
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  viewModeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.mutedDark,
    borderRadius: 14,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  activeViewMode: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  viewModeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
  activeViewModeText: {
    color: Colors.white,
    fontWeight: '700',
  },
  tabSelectorContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
    backgroundColor: Colors.mutedDark,
    borderRadius: 14,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mapContainer: {
    flex: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeSegment: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
  activeSegmentText: {
    color: Colors.semantic.tabActive,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FEF1F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 15,
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingState: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  tasksList: {
    paddingHorizontal: 16,
    paddingBottom: 80 + 24,
  },
  taskCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  statusContainer: {
    marginBottom: 16,
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  categoryBadge: {
    backgroundColor: Colors.mutedDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
    letterSpacing: 0.2,
  },
  taskReward: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: -0.3,
  },
  taskDescription: {
    fontSize: 15,
    color: Colors.semantic.tabInactive,
    lineHeight: 22,
    marginBottom: 16,
  },
  taskDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    color: Colors.semantic.bodyText,
    fontWeight: '500',
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metaText: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    gap: 6,
    backgroundColor: Colors.primary + '10',
  },
  statusButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  acceptButton: {
    backgroundColor: Colors.semantic.primaryButton,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonLoading: {
    backgroundColor: Colors.semantic.tabInactive,
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    gap: 8,
    backgroundColor: Colors.primary + '10',
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  reviewButton: {
    backgroundColor: Colors.semantic.successAlert,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    shadowColor: Colors.semantic.successAlert,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  ownTaskIndicator: {
    backgroundColor: Colors.mutedDark,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ownTaskText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
    letterSpacing: 0.2,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    paddingBottom: 80 + 24,
    minHeight: 300,
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
    paddingHorizontal: 40,
  },
});