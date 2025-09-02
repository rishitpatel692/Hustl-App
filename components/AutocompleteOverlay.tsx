import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Platform
} from 'react-native';
import { Search, MapPin, Building, Coffee, BookOpen, Dumbbell, Store } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { UF_CAMPUS_LOCATIONS, type CampusLocation } from '@/lib/geocoding';
import Overlay from './Overlay';

interface AutocompleteOverlayProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: string) => void;
  placeholder?: string;
  value?: string;
  anchorPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function AutocompleteOverlay({ 
  visible,
  onClose,
  onLocationSelect, 
  placeholder = "Search locations...",
  value = "",
  anchorPosition
}: AutocompleteOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (visible) {
      // Focus search input when overlay opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // Clear search when closing
      setSearchQuery('');
    }
  }, [visible]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const getLocationIcon = (type: CampusLocation['type']) => {
    switch (type) {
      case 'dining_hall':
      case 'food_court':
        return <Coffee size={16} color={Colors.primary} strokeWidth={2} />;
      case 'library':
        return <BookOpen size={16} color={Colors.primary} strokeWidth={2} />;
      case 'gym':
        return <Dumbbell size={16} color={Colors.primary} strokeWidth={2} />;
      case 'store':
        return <Store size={16} color={Colors.primary} strokeWidth={2} />;
      case 'building':
      default:
        return <Building size={16} color={Colors.primary} strokeWidth={2} />;
    }
  };

  const getLocationTypeLabel = (type: CampusLocation['type']): string => {
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

  const filteredLocations = UF_CAMPUS_LOCATIONS.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getLocationTypeLabel(location.type).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedLocations = filteredLocations.reduce((groups, location) => {
    const type = location.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(location);
    return groups;
  }, {} as Record<string, CampusLocation[]>);

  const handleLocationSelect = (location: CampusLocation) => {
    triggerHaptics();
    onLocationSelect(location.address);
    onClose();
  };

  const handleManualInput = () => {
    triggerHaptics();
    if (searchQuery.trim()) {
      onLocationSelect(searchQuery.trim());
    }
    onClose();
  };

  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      anchorPosition={anchorPosition}
      placement="bottom"
      maxHeight={400}
    >
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Search size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholder}
              placeholderTextColor={Colors.semantic.tabInactive}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleManualInput}
            />
          </View>
          
          {searchQuery.trim() && (
            <TouchableOpacity style={styles.manualButton} onPress={handleManualInput}>
              <Text style={styles.manualButtonText}>Use "{searchQuery}"</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Locations List */}
        <ScrollView 
          style={styles.locationsList} 
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {Object.entries(groupedLocations).map(([type, locations]) => (
            <View key={type} style={styles.locationGroup}>
              <Text style={styles.groupTitle}>
                {getLocationTypeLabel(type as CampusLocation['type'])}s
              </Text>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.name}
                  style={styles.locationItem}
                  onPress={() => handleLocationSelect(location)}
                  activeOpacity={0.7}
                >
                  <View style={styles.locationIcon}>
                    {getLocationIcon(location.type)}
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationAddress} numberOfLines={1}>
                      {location.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          
          {filteredLocations.length === 0 && searchQuery && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No locations found</Text>
              <TouchableOpacity style={styles.manualEntryButton} onPress={handleManualInput}>
                <Text style={styles.manualEntryText}>Use "{searchQuery}" anyway</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  header: {
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.mutedDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
    minHeight: 20,
  },
  manualButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  locationsList: {
    maxHeight: 300,
  },
  locationGroup: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: Colors.mutedDark,
    gap: 16,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  noResults: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  manualEntryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  manualEntryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});