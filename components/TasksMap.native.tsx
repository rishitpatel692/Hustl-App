import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Alert, Platform } from 'react-native';
// import MapView, { Marker, PROVIDER_GOOGLE, Region, Callout } from 'expo-maps'; // Temporarily disabled for Expo Go
import * as Location from 'expo-location';
import { MapPin, Store, Navigation, Coffee, BookOpen, Dumbbell, Building } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { openGoogleMapsNavigation } from '@/lib/navigation';
import { UF_CAMPUS_LOCATIONS } from '@/lib/geocoding';

export type TaskPin = { 
  id: string; 
  title: string; 
  reward: string;
  store: string;
  urgency: string;
  latitude: number; 
  longitude: number; 
  storeCoordinates?: { latitude: number; longitude: number };
  dropoffCoordinates?: { latitude: number; longitude: number };
};

interface TasksMapProps {
  pins?: TaskPin[];
  onPressPin?: (id: string) => void;
  showsUserLocation?: boolean;
  locationPermission?: string;
  onRequestLocation?: () => void;
  showNavigationButtons?: boolean;
}

const UF_CAMPUS: Region = { 
  latitude: 29.6436, 
  longitude: -82.3549, 
  latitudeDelta: 0.035, 
  longitudeDelta: 0.035 
};

export default function TasksMap({
  pins = [],
  onPressPin,
  showsUserLocation = false,
  locationPermission,
  onRequestLocation,
  showNavigationButtons = true,
}: TasksMapProps) {
  const [isReady, setIsReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(UF_CAMPUS);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        if (locationPermission !== 'granted') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            const userCoords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setUserLocation(userCoords);
            
            // Center map on user location if it's near campus
            const distanceFromCampus = Math.sqrt(
              Math.pow(userCoords.latitude - UF_CAMPUS.latitude, 2) +
              Math.pow(userCoords.longitude - UF_CAMPUS.longitude, 2)
            );
            
            if (distanceFromCampus < 0.1) { // Within ~10km of campus
              setMapRegion({
                ...userCoords,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
            }
          }
        }
      } catch (error) {
        console.warn('Location permission error:', error);
        setMapError('Location services unavailable');
      } finally {
        setIsReady(true);
      }
    };

    initializeMap();
  }, [locationPermission]);

  const handleNavigateToTask = async (pin: TaskPin) => {
    if (!userLocation) {
      Alert.alert(
        'Location Required',
        'Please enable location services to use navigation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: onRequestLocation }
        ]
      );
      return;
    }
    
    try {
      await openGoogleMapsNavigation({
        start: { lat: userLocation.latitude, lng: userLocation.longitude },
        dest: { lat: pin.latitude, lng: pin.longitude },
        waypoint: pin.storeCoordinates ? {
          lat: pin.storeCoordinates.latitude,
          lng: pin.storeCoordinates.longitude
        } : undefined,
      });
    } catch (error) {
      console.warn('Failed to open navigation:', error);
      Alert.alert(
        'Navigation Error',
        'Unable to open Google Maps. Please make sure the app is installed.',
        [{ text: 'OK' }]
      );
    }
  };

  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'low':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'high':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getCampusLocationColor = (type: string): string => {
    switch (type) {
      case 'dining_hall':
      case 'food_court':
        return '#FF6B35';
      case 'library':
        return '#8B5CF6';
      case 'gym':
        return '#10B981';
      case 'store':
        return '#F59E0B';
      case 'building':
      default:
        return '#6B7280';
    }
  };

  const getCampusLocationIcon = (type: string) => {
    switch (type) {
      case 'dining_hall':
      case 'food_court':
        return <Coffee size={12} color={Colors.white} strokeWidth={2} />;
      case 'library':
        return <BookOpen size={12} color={Colors.white} strokeWidth={2} />;
      case 'gym':
        return <Dumbbell size={12} color={Colors.white} strokeWidth={2} />;
      case 'store':
        return <Store size={12} color={Colors.white} strokeWidth={2} />;
      case 'building':
      default:
        return <Building size={12} color={Colors.white} strokeWidth={2} />;
    }
  };

  const getLocationTypeLabel = (type: string): string => {
    switch (type) {
      case 'dining_hall':
        return 'Dining Hall';
      case 'food_court':
        return 'Food Court';
      case 'library':
        return 'Library';
      case 'gym':
        return 'Gym';
      case 'store':
        return 'Store';
      case 'building':
        return 'Building';
      default:
        return 'Location';
    }
  };

  const handleLocationPermissionRequest = () => {
    Alert.alert(
      'Location Permission',
      'This app needs location access to show your position on the map and provide navigation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable', onPress: onRequestLocation }
      ]
    );
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (mapError) {
    return (
      <View style={styles.errorContainer}>
        <MapPin size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
        <Text style={styles.errorTitle}>Map Unavailable</Text>
        <Text style={styles.errorText}>{mapError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setMapError(null);
          setIsReady(false);
        }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Native MapView temporarily disabled for Expo Go stability */}
      <View style={styles.mapPlaceholder}>
        <MapPin size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
        <Text style={styles.mapPlaceholderTitle}>Map View</Text>
        <Text style={styles.mapPlaceholderText}>
          Native maps are temporarily disabled for Expo Go compatibility.
          Use the web version or build a development client to see the full map experience.
        </Text>
        <TouchableOpacity 
          style={styles.webMapButton}
          onPress={() => {
            const mapUrl = `https://www.google.com/maps/@29.6436,-82.3549,15z`;
            if (Platform.OS === 'web') {
              window.open(mapUrl, '_blank');
            }
          }}
        >
          <Text style={styles.webMapButtonText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.semantic.screen,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.semantic.screen,
    paddingHorizontal: 40,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  errorText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  permissionOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  storeMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  campusMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutContainer: {
    minWidth: 200,
    maxWidth: 250,
    padding: 12,
    gap: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    letterSpacing: -0.2,
  },
  calloutReward: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: -0.3,
  },
  calloutStore: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
    fontWeight: '500',
  },
  calloutAddress: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    marginTop: 4,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  navigateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.semantic.screen,
    paddingHorizontal: 40,
    gap: 16,
  },
  mapPlaceholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 20,
  },
  webMapButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  webMapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});