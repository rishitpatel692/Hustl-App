import React, { useEffect, useState } from 'react';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region, Callout } from 'expo-maps';
import * as Location from 'expo-location';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MapPin, Store, Navigation } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { openGoogleMapsNavigation } from '@/lib/navigation';

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

  useEffect(() => {
    const initializeMap = async () => {
      try {
        if (locationPermission !== 'granted') {
          await Location.requestForegroundPermissionsAsync();
        }
      } catch (error) {
        console.warn('Location permission error:', error);
      } finally {
        setIsReady(true);
      }
    };

    const getCurrentLocation = async () => {
      try {
        if (locationPermission === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.warn('Failed to get current location:', error);
      }
    };

    initializeMap();
    getCurrentLocation();
  }, [locationPermission]);

  const handleNavigateToTask = async (pin: TaskPin) => {
    if (!userLocation) return;
    
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

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={UF_CAMPUS}
        showsUserLocation={showsUserLocation && locationPermission === 'granted'}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapType="standard"
        showsBuildings={true}
        showsIndoors={true}
        showsPointsOfInterest={true}
        showsTraffic={false}
      >
        {pins.map((pin) => (
          <React.Fragment key={pin.id}>
            {/* Main task marker (dropoff location) */}
            <Marker
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              pinColor={getUrgencyColor(pin.urgency)}
              onPress={() => onPressPin?.(pin.id)}
            >
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>
                    {pin.title}
                  </Text>
                  <Text style={styles.calloutReward}>{pin.reward}</Text>
                  <Text style={styles.calloutStore} numberOfLines={1}>
                    📍 {pin.store}
                  </Text>
                  <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(pin.urgency) + '20' }]}>
                    <View style={[styles.urgencyDot, { backgroundColor: getUrgencyColor(pin.urgency) }]} />
                    <Text style={[styles.urgencyText, { color: getUrgencyColor(pin.urgency) }]}>
                      {pin.urgency.toUpperCase()}
                    </Text>
                  </View>
                  
                  {showNavigationButtons && userLocation && (
                    <TouchableOpacity
                      style={styles.navigateButton}
                      onPress={() => handleNavigateToTask(pin)}
                    >
                      <Navigation size={12} color={Colors.white} strokeWidth={2} />
                      <Text style={styles.navigateButtonText}>Navigate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Callout>
            </Marker>
            
            {/* Store marker (pickup location) if coordinates available */}
            {pin.storeCoordinates && (
              <Marker
                coordinate={pin.storeCoordinates}
                pinColor="#FF6B35"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.storeMarker}>
                  <Store size={16} color={Colors.white} strokeWidth={2} />
                </View>
                <Callout>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>Pickup Location</Text>
                    <Text style={styles.calloutStore}>{pin.store}</Text>
                  </View>
                </Callout>
              </Marker>
            )}
          </React.Fragment>
        ))}
      </MapView>
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
  calloutContainer: {
    minWidth: 200,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    marginTop: 8,
  },
  navigateButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
});