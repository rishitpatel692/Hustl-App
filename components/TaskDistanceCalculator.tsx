import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Navigation, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Colors } from '@/theme/colors';
import { GeocodingService, type Coordinates } from '@/lib/geocoding';

interface TaskDistanceCalculatorProps {
  storeAddress: string;
  dropoffAddress: string;
  showWalkingTime?: boolean;
  showDrivingTime?: boolean;
}

export default function TaskDistanceCalculator({
  storeAddress,
  dropoffAddress,
  showWalkingTime = true,
  showDrivingTime = false
}: TaskDistanceCalculatorProps) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [storeDistance, setStoreDistance] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<{
    walking: number;
    driving: number;
  } | null>(null);

  useEffect(() => {
    calculateDistances();
  }, [storeAddress, dropoffAddress]);

  const calculateDistances = async () => {
    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(userCoords);

      // For demo, use approximate coordinates
      // In a real app, you'd geocode the actual addresses
      const storeCoords = { latitude: 29.6436, longitude: -82.3549 }; // UF campus
      const dropoffCoords = { latitude: 29.6436 + 0.01, longitude: -82.3549 + 0.01 };

      // Calculate distances
      const distanceToStore = GeocodingService.calculateDistance(userCoords, storeCoords);
      const storeToDropoff = GeocodingService.calculateDistance(storeCoords, dropoffCoords);
      const totalDist = distanceToStore + storeToDropoff;

      setStoreDistance(distanceToStore);
      setTotalDistance(totalDist);

      // Estimate times (walking: ~5km/h, driving: ~30km/h in campus)
      setEstimatedTime({
        walking: Math.round(totalDist * 12), // ~12 minutes per km walking
        driving: Math.round(totalDist * 2.5), // ~2.5 minutes per km driving
      });

    } catch (error) {
      console.warn('Failed to calculate distances:', error);
    }
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  if (!userLocation || !totalDistance || !estimatedTime) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.distanceInfo}>
        <View style={styles.distanceItem}>
          <Navigation size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
          <Text style={styles.distanceText}>
            {formatDistance(totalDistance)} total
          </Text>
        </View>

        {showWalkingTime && (
          <View style={styles.distanceItem}>
            <Clock size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.distanceText}>
              ~{estimatedTime.walking}m walk
            </Text>
          </View>
        )}

        {showDrivingTime && (
          <View style={styles.distanceItem}>
            <Clock size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.distanceText}>
              ~{estimatedTime.driving}m drive
            </Text>
          </View>
        )}
      </View>

      {storeDistance && storeDistance > 2 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Store is {formatDistance(storeDistance)} away from your location
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  distanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceText: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: Colors.secondary + '10',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.secondary + '20',
  },
  warningText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
  },
});