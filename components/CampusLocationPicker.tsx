import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MapPin, Search, Building, Coffee, BookOpen, Dumbbell, Store } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { UF_CAMPUS_LOCATIONS, type CampusLocation } from '@/lib/geocoding';

interface CampusLocationPickerProps {
  onLocationSelect: (location: string) => void;
  placeholder?: string;
  value?: string;
}

export default function CampusLocationPicker({ 
  onLocationSelect, 
  placeholder = "Select location...",
  value = ""
}: CampusLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(value);

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
    setSelectedLocation(location.name);
    onLocationSelect(location.address);
    setShowPicker(false);
    setSearchQuery('');
  };

  const handleManualInput = () => {
    setShowPicker(false);
    // Allow manual typing in the main input
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.inputButton}
        onPress={() => setShowPicker(!showPicker)}
      >
        <MapPin size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
        <Text style={[
          styles.inputText,
          !selectedLocation && styles.placeholderText
        ]}>
          {selectedLocation || placeholder}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <View style={styles.picker}>
          <View style={styles.pickerHeader}>
            <View style={styles.searchContainer}>
              <Search size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search campus locations..."
                placeholderTextColor={Colors.semantic.tabInactive}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity style={styles.manualButton} onPress={handleManualInput}>
              <Text style={styles.manualButtonText}>Manual Entry</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.locationsList} showsVerticalScrollIndicator={false}>
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
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
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
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
    fontWeight: '500',
  },
  placeholderText: {
    color: Colors.semantic.tabInactive,
  },
  picker: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
    shadowColor: Colors.semantic.cardShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 1000,
    maxHeight: 400,
  },
  pickerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.dividerLight,
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
    borderWidth: 1,
    borderColor: Colors.semantic.borderLight,
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
});