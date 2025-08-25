import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { MapPin, Navigation, Building, Search, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Colors } from '@/theme/colors';
import { GeocodingService, UF_CAMPUS_LOCATIONS, type Coordinates } from '@/lib/geocoding';

interface SmartLocationInputProps {
  value: string;
  onLocationSelect: (address: string, coordinates?: Coordinates) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  showCampusLocations?: boolean;
  disabled?: boolean;
}

export default function SmartLocationInput({
  value,
  onLocationSelect,
  placeholder = "Search for a location...",
  label,
  error,
  showCampusLocations = true,
  disabled = false
}: SmartLocationInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const googlePlacesRef = useRef<any>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
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

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleLocationSelect = (address: string, coordinates?: Coordinates) => {
    triggerHaptics();
    onLocationSelect(address, coordinates);
    setIsExpanded(false);
    googlePlacesRef.current?.setAddressText('');
  };

  const handleUseCurrentLocation = async () => {
    if (!userLocation) {
      await getCurrentLocation();
      return;
    }

    triggerHaptics();
    setIsGettingLocation(true);

    try {
      const { data: address, error } = await GeocodingService.reverseGeocode(userLocation);
      
      if (address) {
        handleLocationSelect(address, userLocation);
      } else {
        console.warn('Failed to get address for current location:', error);
      }
    } catch (error) {
      console.warn('Failed to reverse geocode:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleGooglePlaceSelect = (data: any, details: any) => {
    if (details?.geometry?.location) {
      const coordinates: Coordinates = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
      };
      handleLocationSelect(details.formatted_address || data.description, coordinates);
    }
  };

  const getCampusLocationIcon = (type: string) => {
    switch (type) {
      case 'dining_hall':
      case 'food_court':
        return '🍽️';
      case 'library':
        return '📚';
      case 'gym':
        return '🏋️';
      case 'store':
        return '🏪';
      case 'building':
        return '🏢';
      default:
        return '📍';
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.inputButton,
          error && styles.inputError,
          disabled && styles.inputDisabled
        ]}
        onPress={() => !disabled && setIsExpanded(true)}
        disabled={disabled}
      >
        <MapPin size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
        <Text style={[
          styles.inputText,
          !value && styles.placeholderText
        ]}>
          {value || placeholder}
        </Text>
        <Search size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isExpanded && (
        <View style={styles.expandedContainer}>
          <View style={styles.expandedHeader}>
            <Text style={styles.expandedTitle}>Select Location</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsExpanded(false)}
            >
              <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Google Places Autocomplete */}
          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              ref={googlePlacesRef}
              placeholder="Search with Google Maps..."
              onPress={handleGooglePlaceSelect}
              query={{
                key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
                language: 'en',
                components: 'country:us',
                location: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : '29.6436,-82.3549',
                radius: 50000,
              }}
              fetchDetails={true}
              enablePoweredByContainer={false}
              styles={{
                container: styles.autocompleteContainer,
                textInputContainer: styles.autocompleteInputContainer,
                textInput: styles.autocompleteInput,
                listView: styles.autocompleteList,
                row: styles.autocompleteRow,
                description: styles.autocompleteDescription,
              }}
              textInputProps={{
                placeholderTextColor: Colors.semantic.tabInactive,
                autoCorrect: false,
                autoCapitalize: 'none',
              }}
              debounce={300}
              minLength={2}
            />
          </View>

          {/* Current Location */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleUseCurrentLocation}
            disabled={isGettingLocation}
          >
            <Navigation size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.currentLocationText}>
              {isGettingLocation ? 'Getting location...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>

          {/* Campus Locations */}
          {showCampusLocations && (
            <ScrollView style={styles.campusLocations} showsVerticalScrollIndicator={false}>
              <Text style={styles.campusTitle}>Popular Campus Locations</Text>
              {UF_CAMPUS_LOCATIONS.slice(0, 8).map((location, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.campusLocationItem}
                  onPress={() => handleLocationSelect(location.address, location.coordinates)}
                >
                  <Text style={styles.campusLocationIcon}>
                    {getCampusLocationIcon(location.type)}
                  </Text>
                  <View style={styles.campusLocationInfo}>
                    <Text style={styles.campusLocationName}>{location.name}</Text>
                    <Text style={styles.campusLocationAddress} numberOfLines={1}>
                      {location.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 8,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
    minHeight: 52,
    backgroundColor: Colors.semantic.inputBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  inputError: {
    borderColor: Colors.semantic.errorAlert,
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: Colors.mutedDark,
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
    fontWeight: '500',
  },
  placeholderText: {
    color: Colors.semantic.tabInactive,
  },
  errorText: {
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    marginTop: 8,
    fontWeight: '500',
  },
  expandedContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 1000,
    maxHeight: 400,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
  },
  expandedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.mutedDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
  },
  autocompleteContainer: {
    flex: 0,
  },
  autocompleteInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  autocompleteInput: {
    backgroundColor: Colors.semantic.inputBackground,
    color: Colors.semantic.inputText,
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  autocompleteList: {
    backgroundColor: Colors.semantic.inputBackground,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 150,
  },
  autocompleteRow: {
    backgroundColor: Colors.semantic.inputBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
  },
  autocompleteDescription: {
    fontSize: 15,
    color: Colors.semantic.inputText,
    fontWeight: '500',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  campusLocations: {
    maxHeight: 200,
  },
  campusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  campusLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  campusLocationIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  campusLocationInfo: {
    flex: 1,
  },
  campusLocationName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  campusLocationAddress: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
  },
});