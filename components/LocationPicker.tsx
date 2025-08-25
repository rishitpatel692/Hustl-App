import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Search, Navigation, Building } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { GeocodingService, UF_CAMPUS_LOCATIONS, type Coordinates, type CampusLocation } from '@/lib/geocoding';

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (address: string, coordinates: Coordinates) => void;
  title?: string;
  placeholder?: string;
  showCampusLocations?: boolean;
}

export default function LocationPicker({
  visible,
  onClose,
  onLocationSelect,
  title = 'Select Location',
  placeholder = 'Search for a location...',
  showCampusLocations = true,
}: LocationPickerProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get user's current location on mount
  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  // Search for places when query changes
  useEffect(() => {
    if (searchQuery.length > 2) {
      searchPlaces();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
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
    } finally {
      setIsGettingLocation(false);
    }
  };

  const searchPlaces = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await GeocodingService.searchPlaces(searchQuery, userLocation || undefined);
      
      if (data) {
        setSearchResults(data);
      } else if (error) {
        console.warn('Search error:', error);
        setSearchResults([]);
      }
    } catch (error) {
      console.warn('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
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

  const handleLocationSelect = (address: string, coordinates: Coordinates) => {
    triggerHaptics();
    onLocationSelect(address, coordinates);
    onClose();
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCampusLocationSelect = (location: CampusLocation) => {
    handleLocationSelect(location.address, location.coordinates);
  };

  const handleSearchResultSelect = (result: any) => {
    handleLocationSelect(result.formatted_address, result.coordinates);
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

  const getCampusLocationIcon = (type: CampusLocation['type']) => {
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

  const groupedCampusLocations = UF_CAMPUS_LOCATIONS.reduce((groups, location) => {
    const type = location.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(location);
    return groups;
  }, {} as Record<string, CampusLocation[]>);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.semantic.tabInactive}
                  autoCorrect={false}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={Colors.primary} />
                )}
              </View>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Current Location */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.currentLocationButton}
                  onPress={handleUseCurrentLocation}
                  disabled={isGettingLocation}
                >
                  <View style={styles.currentLocationIcon}>
                    {isGettingLocation ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Navigation size={20} color={Colors.primary} strokeWidth={2} />
                    )}
                  </View>
                  <View style={styles.currentLocationText}>
                    <Text style={styles.currentLocationTitle}>
                      {isGettingLocation ? 'Getting location...' : 'Use Current Location'}
                    </Text>
                    <Text style={styles.currentLocationSubtitle}>
                      {userLocation ? 'Location available' : 'Tap to get your location'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Search Results</Text>
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.locationItem}
                      onPress={() => handleSearchResultSelect(result)}
                    >
                      <View style={styles.locationIcon}>
                        <MapPin size={20} color={Colors.primary} strokeWidth={2} />
                      </View>
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationName} numberOfLines={1}>
                          {result.name || 'Location'}
                        </Text>
                        <Text style={styles.locationAddress} numberOfLines={2}>
                          {result.formatted_address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Campus Locations */}
              {showCampusLocations && searchQuery.length === 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Popular Campus Locations</Text>
                  
                  {Object.entries(groupedCampusLocations).map(([type, locations]) => (
                    <View key={type} style={styles.locationGroup}>
                      <Text style={styles.groupTitle}>
                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                      {locations.map((location, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.campusLocationItem}
                          onPress={() => handleCampusLocationSelect(location)}
                        >
                          <View style={styles.campusLocationIcon}>
                            <Text style={styles.campusLocationEmoji}>
                              {getCampusLocationIcon(location.type)}
                            </Text>
                          </View>
                          <View style={styles.locationInfo}>
                            <Text style={styles.locationName} numberOfLines={1}>
                              {location.name}
                            </Text>
                            <Text style={styles.locationAddress} numberOfLines={1}>
                              {location.address}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {/* Empty State */}
              {searchQuery.length > 2 && searchResults.length === 0 && !isSearching && (
                <View style={styles.emptyState}>
                  <Building size={32} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
                  <Text style={styles.emptyStateText}>No locations found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Try searching for a different address or location name
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.semantic.screen,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: '60%',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.semantic.tabInactive + '40',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mutedDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.inputBackground,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: Colors.semantic.inputText,
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  currentLocationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationText: {
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  currentLocationSubtitle: {
    fontSize: 15,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  locationGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    marginBottom: 12,
    paddingHorizontal: 4,
    letterSpacing: -0.2,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 8,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  campusLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 8,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  campusLocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  campusLocationEmoji: {
    fontSize: 20,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  locationAddress: {
    fontSize: 15,
    color: Colors.semantic.tabInactive,
    lineHeight: 20,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
});