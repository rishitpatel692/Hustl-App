import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { MapPin, Navigation, ExternalLink } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

const { width, height } = Dimensions.get('window');

export interface TaskPin {
  id: string;
  title: string;
  reward: string;
  store: string;
  urgency: string;
  latitude: number;
  longitude: number;
}

interface TasksMapProps {
  pins?: TaskPin[];
  onPressPin?: (id: string) => void;
  showsUserLocation?: boolean;
  locationPermission?: string;
  onRequestLocation?: () => void;
}

export default function TasksMap({ 
  pins = [], 
  onPressPin,
  showsUserLocation,
  locationPermission,
  onRequestLocation
}: TasksMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      setMapLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleOpenGoogleMaps = () => {
    // Create a URL with all task pins as markers
    let mapUrl = 'https://www.google.com/maps/@29.6436,-82.3549,15z';
    
    if (pins.length > 0) {
      // Add markers for each task
      const markers = pins.map(pin => `${pin.latitude},${pin.longitude}`).join('|');
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${pins[0].latitude},${pins[0].longitude}`;
    }
    
    window.open(mapUrl, '_blank');
  };

  const handleTaskPin = (pin: TaskPin) => {
    const taskUrl = `https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`;
    window.open(taskUrl, '_blank');
    onPressPin?.(pin.id);
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Embedded Google Maps iframe for web */}
      <View style={styles.mapContainer}>
        <iframe
          src={`https://www.google.com/maps/embed/v1/view?key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}&center=29.6436,-82.3549&zoom=15&maptype=roadmap`}
          style={styles.mapFrame}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        
        {/* Map overlay with task pins */}
        <View style={styles.mapOverlay}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Campus Tasks</Text>
            <TouchableOpacity style={styles.fullscreenButton} onPress={handleOpenGoogleMaps}>
              <ExternalLink size={16} color={Colors.white} strokeWidth={2} />
              <Text style={styles.fullscreenButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>
          </View>
          
          {pins.length > 0 && (
            <View style={styles.taskPinsList}>
              {pins.slice(0, 3).map((pin) => (
                <TouchableOpacity
                  key={pin.id}
                  style={styles.taskPinItem}
                  onPress={() => handleTaskPin(pin)}
                >
                  <View style={[styles.pinMarker, { backgroundColor: getUrgencyColor(pin.urgency) }]}>
                    <MapPin size={12} color={Colors.white} strokeWidth={2} />
                  </View>
                  <View style={styles.pinInfo}>
                    <Text style={styles.pinTitle} numberOfLines={1}>{pin.title}</Text>
                    <Text style={styles.pinStore} numberOfLines={1}>{pin.store}</Text>
                  </View>
                  <Text style={styles.pinReward}>{pin.reward}</Text>
                </TouchableOpacity>
              ))}
              
              {pins.length > 3 && (
                <TouchableOpacity style={styles.viewMoreButton} onPress={handleOpenGoogleMaps}>
                  <Text style={styles.viewMoreText}>+{pins.length - 3} more tasks</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapFrame: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  mapHeader: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'auto',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  fullscreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fullscreenButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  taskPinsList: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    pointerEvents: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  taskPinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  pinMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinInfo: {
    flex: 1,
  },
  pinTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  pinStore: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  pinReward: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.dividerLight,
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});