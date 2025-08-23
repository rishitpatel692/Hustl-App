/**
 * Hustl App - iOS-first Color System
 * Single source of truth for all color tokens
 * Designed for React Native with iOS-first principles
 */

export const Colors = {
  // Primary / UF Blue
  primary: '#0021A5', // Updated UF Blue
  primaryDark: '#001F5C',
  primaryLight: '#0038FF',

  // Secondary / UF Orange  
  secondary: '#FA4616', // Updated UF Orange
  secondaryLight: '#FF5A1F',
  secondaryDark: '#E63A0B',

  // Surfaces & Text
  white: '#FFFFFF',
  bg: '#0021A5', // Vibrant UF Blue background
  muted: '#F5F5F5',
  border: '#E5E7EB',
  text: '#F1F5F9', // Light text for dark theme
  textHover: '#0A1B3D',

  // Status / Badges
  gold: '#FFD700',
  purple: '#8B5CF6',
  purpleDark: '#6D28D9',
  success: '#10B981',
  successDark: '#059669',
  accepted: '#3B82F6',
  acceptedDark: '#1D4ED8',
  inProgress: '#F59E0B',
  inProgressDark: '#D97706',

  // Scrollbar (mobile friendly)
  scrollbar: '#C1C1C1',
  scrollbarHover: '#A1A1A1',

  // Semantic color mappings for components
  semantic: {
    // Buttons
    primaryButton: '#0021A5',
    primaryButtonPressed: '#001F5C',
    primaryButtonFocus: '#0038FF',
    
    secondaryButton: '#FA4616',
    secondaryButtonPressed: '#E63A0B',
    secondaryButtonAccent: '#FF5A1F',

    // Surfaces
    screen: '#0021A5', // Vibrant blue background
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    
    // Text
    bodyText: '#F1F5F9', // Light text
    headingText: '#F1F5F9', // Light text
    interactiveText: '#F1F5F9', // Light text
    interactiveTextPressed: '#0A1B3D',
    
    // Inputs
    inputBackground: '#F5F5F5',
    inputBorder: '#E5E7EB',
    inputText: '#0F2557',
    inputFocus: '#0038FF',
    
    // Status badges
    premiumBadge: '#FFD700',
    acceptedBadge: '#3B82F6',
    acceptedBadgePressed: '#1D4ED8',
    inProgressBadge: '#F59E0B',
    inProgressBadgePressed: '#D97706',
    completedBadge: '#10B981',
    completedBadgePressed: '#059669',
    specialBadge: '#8B5CF6',
    specialBadgePressed: '#6D28D9',
    
    // Alerts & Toasts
    successAlert: '#10B981',
    errorAlert: '#E63A0B',
    errorAlertText: '#FFFFFF',
    infoAlert: '#0038FF',
    
    // Navigation
    tabInactive: '#9CA3AF', // Derived from border
    tabActive: '#0021A5',
    fabBackground: '#FF4D23',
    fabIcon: '#FFFFFF',
    
    // Dividers
    divider: '#E5E7EB',
  }
};

// Utility functions for color manipulation
export const ColorUtils = {
  // Add opacity to any color
  withOpacity: (color: string, opacity: number): string => {
    const hex = color.replace('#', '');
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `#${hex}${alpha}`;
  },

  // Get appropriate text color for background
  getTextColor: (backgroundColor: string): string => {
    // For dark backgrounds (primary, secondary, etc.), use white text
    const darkBackgrounds = [
      Colors.primary,
      Colors.primaryDark,
      Colors.secondary,
      Colors.secondaryDark,
      Colors.text,
      Colors.textHover,
      Colors.acceptedDark,
      Colors.inProgressDark,
      Colors.successDark,
      Colors.purpleDark,
    ];
    
    return darkBackgrounds.includes(backgroundColor) ? Colors.white : Colors.text;
  },

  // Get pressed state color
  getPressedColor: (baseColor: string): string => {
    const pressedMap: Record<string, string> = {
      [Colors.primary]: Colors.primaryDark,
      [Colors.secondary]: Colors.secondaryDark,
      [Colors.accepted]: Colors.acceptedDark,
      [Colors.inProgress]: Colors.inProgressDark,
      [Colors.success]: Colors.successDark,
      [Colors.purple]: Colors.purpleDark,
    };
    
    return pressedMap[baseColor] || baseColor;
  },
};

export default Colors;