import React, { useEffect, useState } from 'react';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'expo-maps';
import * as Location from 'expo-location';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';

export type TaskPin = { 
  id: string; 
  title: string; 
  reward: string;
  store: string;
  urgency: string;
  latitude: number; 
  longitude: number; 
};

interface TasksMapProps {
  pins?: TaskPin[];
  onPressPin?: (id: string) => void;
  showsUserLocation?: boolean;
  locationPermission?: string;
  onRequestLocation?: () => void;
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
}: TasksMapProps) {
  const [isReady, setIsReady] = useState(false);

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

    initializeMap();
  }, [locationPermission]);

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
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.title}
            description={`${pin.reward} • ${pin.store}`}
            pinColor={getUrgencyColor(pin.urgency)}
            onPress={() => onPressPin?.(pin.id)}
          />
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
});