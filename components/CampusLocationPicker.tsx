import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import AutocompleteOverlay from './AutocompleteOverlay';

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
  const [showOverlay, setShowOverlay] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | undefined>();
  const inputRef = useRef<TouchableOpacity>(null);

  const handleInputPress = () => {
    // Measure input position for overlay placement
    inputRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorPosition({ x, y, width, height });
      setShowOverlay(true);
    });
  };

  const handleLocationSelect = (location: string) => {
    onLocationSelect(location);
    setShowOverlay(false);
  };

  return (
    <>
      <TouchableOpacity
        ref={inputRef}
        style={styles.inputButton}
        onPress={handleInputPress}
        accessibilityLabel="Select location"
        accessibilityRole="button"
      >
        <MapPin size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
        <Text style={[
          styles.inputText,
          !value && styles.placeholderText
        ]}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      <AutocompleteOverlay
        visible={showOverlay}
        onClose={() => setShowOverlay(false)}
        onLocationSelect={handleLocationSelect}
        placeholder="Search campus locations..."
        anchorPosition={anchorPosition}
      />
    </>
  );
}

const styles = StyleSheet.create({
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
});