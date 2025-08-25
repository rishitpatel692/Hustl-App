import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MapPin, Navigation, Clock, Star } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Colors } from '@/theme/colors';
import { TaskRepo } from '@/lib/taskRepo';
import { GeocodingService, type Coordinates } from '@/lib/geocoding';
import { Task } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

interface NearbyTask extends Task {
  distance?: number;
  estimatedWalkTime?: number;
}

export default function NearbyTasksWidget() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [nearbyTasks, setNearbyTasks] = useState<NearbyTask[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isGuest && user) {
      loadNearbyTasks();
    }
  }, [user, isGuest]);

  const loadNearbyTasks = async () => {
    setIsLoading(true);
    
    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(coords);

        // Load available tasks
        if (user) {
          const { data: tasks } = await TaskRepo.listOpenTasks(user.id, 10);
          
          if (tasks) {
            // Calculate distances and add location data
            const tasksWithDistance = tasks.map(task => {
              // For demo, use random coordinates around UF campus
              const taskCoords = {
                latitude: 29.6436 + (Math.random() - 0.5) * 0.02,
                longitude: -82.3549 + (Math.random() - 0.5) * 0.02,
              };
              
              const distance = GeocodingService.calculateDistance(coords, taskCoords);
              const estimatedWalkTime = Math.round(distance * 12); // ~12 minutes per km walking
              
              return {
                ...task,
                distance,
                estimatedWalkTime,
              };
            });

            // Sort by distance and take closest 5
            const sortedTasks = tasksWithDistance
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
              .slice(0, 5);

            setNearbyTasks(sortedTasks);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load nearby tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleTaskPress = (task: Task) => {
    triggerHaptics();
    router.push(`/task/${task.id}`);
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  if (isGuest || !user || nearbyTasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MapPin size={20} color={Colors.primary} strokeWidth={2} />
        <Text style={styles.title}>Nearby Tasks</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {nearbyTasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            onPress={() => handleTaskPress(task)}
            activeOpacity={0.8}
          >
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {task.title}
              </Text>
              <Text style={styles.taskReward}>
                {TaskRepo.formatReward(task.reward_cents)}
              </Text>
            </View>

            <Text style={styles.taskStore} numberOfLines={1}>
              {task.store}
            </Text>

            <View style={styles.taskMeta}>
              <View style={styles.metaItem}>
                <Navigation size={12} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.metaText}>
                  {task.distance ? formatDistance(task.distance) : 'Near you'}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Clock size={12} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.metaText}>
                  {task.estimatedWalkTime ? `${task.estimatedWalkTime}m walk` : TaskRepo.formatEstimatedTime(task.estimated_minutes)}
                </Text>
              </View>
            </View>

            <View style={[
              styles.urgencyBadge,
              { backgroundColor: TaskRepo.getUrgencyColor(task.urgency) + '20' }
            ]}>
              <View style={[
                styles.urgencyDot,
                { backgroundColor: TaskRepo.getUrgencyColor(task.urgency) }
              ]} />
              <Text style={[
                styles.urgencyText,
                { color: TaskRepo.getUrgencyColor(task.urgency) }
              ]}>
                {TaskRepo.formatUrgency(task.urgency)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginLeft: 12,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  taskCard: {
    width: 280,
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    marginRight: 12,
  },
  taskReward: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  taskStore: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginBottom: 16,
    fontWeight: '500',
  },
  taskMeta: {
    gap: 8,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '600',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
  },
});