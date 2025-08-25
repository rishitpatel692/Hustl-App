import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, Navigation, ExternalLink } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

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

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setIsLoading(false);
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
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MapPin size={48} color={Colors.primary} strokeWidth={1.5} />
        </View>
        
        <Text style={styles.title}>Interactive Map</Text>
        <Text style={styles.subtitle}>
          Full interactive maps with Google Maps integration are available on mobile devices. 
          Use the buttons below to view locations or browse tasks in the list view.
        </Text>
        
        {pins.length > 0 && (
          <>
            <Text style={styles.taskCount}>
              {pins.length} task{pins.length !== 1 ? 's' : ''} available near campus
            </Text>
            
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
            </View>
          </>
        )}

        <TouchableOpacity style={styles.openMapsButton} onPress={handleOpenGoogleMaps}>
          <ExternalLink size={16} color={Colors.white} strokeWidth={2} />
          <Text style={styles.openMapsButtonText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  function getUrgencyColor(urgency: string): string {
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
  }
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  taskCount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  taskPinsList: {
    width: '100%',
    gap: 8,
  },
  taskPinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  openMapsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});