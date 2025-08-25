import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { MapPin, Navigation, Building, Search, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
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
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(true);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    setShowManualInput(true);
    setManualInput('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleManualInputSubmit = () => {
    if (manualInput.trim()) {
      handleLocationSelect(manualInput.trim());
    }
  };

  const handleSearchQueryChange = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const { data: places } = await GeocodingService.searchPlaces(query, userLocation || undefined);
      setSearchResults(places || []);
    } catch (error) {
      console.warn('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
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

          {/* Input Mode Toggle */}
          <View style={styles.inputToggleContainer}>
            <TouchableOpacity
              style={[styles.inputToggle, showManualInput && styles.inputToggleActive]}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={[styles.inputToggleText, showManualInput && styles.inputToggleTextActive]}>
                Type Address
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inputToggle, !showManualInput && styles.inputToggleActive]}
              onPress={() => setShowManualInput(false)}
            >
              <Text style={[styles.inputToggleText, !showManualInput && styles.inputToggleTextActive]}>
                Search Places
              </Text>
            </TouchableOpacity>
          </View>

          {showManualInput ? (
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualInput}
                value={manualInput}
                onChangeText={setManualInput}
                placeholder="Type address manually..."
                placeholderTextColor={Colors.semantic.tabInactive}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleManualInputSubmit}
                multiline={false}
              />
              <TouchableOpacity
                style={[
                  styles.manualSubmitButton,
                  !manualInput.trim() && styles.manualSubmitButtonDisabled
                ]}
                onPress={handleManualInputSubmit}
                disabled={!manualInput.trim()}
              >
                <Text style={styles.manualSubmitButtonText}>Use Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={handleSearchQueryChange}
                  placeholder="Search restaurants, stores, buildings..."
                  placeholderTextColor={Colors.semantic.tabInactive}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={Colors.primary} />
                )}
              </View>
              
              {searchResults.length > 0 && (
                <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
                  {searchResults.map((place, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => handleLocationSelect(place.formatted_address, place.coordinates)}
                    >
                      <MapPin size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultName} numberOfLines={1}>
                          {place.name || place.formatted_address}
                        </Text>
                        <Text style={styles.searchResultAddress} numberOfLines={1}>
                          {place.formatted_address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

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
            {isGettingLocation && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
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
    zIndex: 1000,
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
    minHeight: 56,
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
    maxHeight: 500,
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
  inputToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: Colors.mutedDark,
    borderRadius: 12,
    padding: 4,
  },
  inputToggle: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  inputToggleActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
  inputToggleTextActive: {
    color: Colors.primary,
  },
  manualInputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.semantic.inputText,
    backgroundColor: Colors.semantic.inputBackground,
    minHeight: 52,
  },
  manualSubmitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
  },
  manualSubmitButtonDisabled: {
    backgroundColor: Colors.semantic.tabInactive,
  },
  manualSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
    fontWeight: '500',
  },
  searchResults: {
    backgroundColor: Colors.semantic.inputBackground,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
    gap: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
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
    flex: 1,
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